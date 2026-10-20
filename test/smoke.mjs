/**
 * Headless smoke test for the browser half.
 *
 * There is no DOM in Node, so this file ships a deliberately tiny one — just
 * enough surface for `src/client.js` to mount, fold, unfold and open its
 * popover. It is not a browser: it verifies the plugin's own wiring (selectors,
 * event handlers, state flow, teardown), not CSS or React integration.
 *
 *   node test/smoke.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));

//#region tiny dom
class DomNode {}

class El extends DomNode {
  constructor(tag) {
    super();
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.attributes = new Map();
    this.classes = new Set();
    this.dataset = {};
    this.style = {};
    this.innerHTML = "";
    this.textContent = "";
    this.title = "";
    this.listeners = new Map();
    this.content = undefined;
    const self = this;
    this.classList = {
      add: (...names) => names.forEach((name) => self.classes.add(name)),
      remove: (...names) => names.forEach((name) => self.classes.delete(name)),
      contains: (name) => self.classes.has(name),
      toggle: (name, force) => {
        const on = force === undefined ? !self.classes.has(name) : Boolean(force);
        if (on) self.classes.add(name);
        else self.classes.delete(name);
        return on;
      },
    };
  }

  get className() {
    return [...this.classes].join(" ");
  }

  set className(value) {
    this.classes = new Set(String(value).split(/\s+/).filter(Boolean));
  }

  get nextElementSibling() {
    const siblings = this.parentElement?.children ?? [];
    const index = siblings.indexOf(this);
    return index < 0 ? null : (siblings[index + 1] ?? null);
  }

  get isConnected() {
    let node = this;
    while (node.parentElement !== null) node = node.parentElement;
    return (
      node === globals.document ||
      node === globals.document.body ||
      node === globals.document.documentElement
    );
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  append(...nodes) {
    for (const node of nodes) this.appendChild(node);
  }

  appendChild(node) {
    node.parentElement = this;
    this.children.push(node);
    return node;
  }

  insertBefore(node, reference) {
    const index = this.children.indexOf(reference);
    node.parentElement = this;
    if (index < 0) this.children.push(node);
    else this.children.splice(index, 0, node);
    return node;
  }

  remove() {
    if (this.parentElement === null) return;
    const index = this.parentElement.children.indexOf(this);
    if (index >= 0) this.parentElement.children.splice(index, 1);
    this.parentElement = null;
  }

  contains(node) {
    let current = node;
    while (current !== null && current !== undefined) {
      if (current === this) return true;
      current = current.parentElement;
    }
    return false;
  }

  /**
   * Only the selector shapes the plugin actually uses are supported: a compound
   * simple selector (`.class`, `[attr="v"]`, `tag`) or a space-separated
   * descendant chain of them.
   */
  matches(selector) {
    const parts = selector.trim().split(/\s+/);
    if (parts.length > 1) {
      if (!this.matches(parts.at(-1))) return false;
      let ancestor = this.parentElement;
      for (let index = parts.length - 2; index >= 0; index -= 1) {
        while (ancestor !== null && !ancestor.matches(parts[index])) ancestor = ancestor.parentElement;
        if (ancestor === null) return false;
        ancestor = ancestor.parentElement;
      }
      return true;
    }
    if (selector.startsWith(".")) return this.classes.has(selector.slice(1));
    if (selector.startsWith("[")) {
      const [, name, value] = /^\[([^\]=]+)(?:="([^"]*)")?\]$/.exec(selector) ?? [];
      if (name === undefined) return false;
      return value === undefined ? this.attributes.has(name) : this.getAttribute(name) === value;
    }
    return this.tagName === selector.toUpperCase();
  }

  querySelectorAll(selector) {
    const out = [];
    const walk = (node) => {
      for (const child of node.children) {
        if (child.matches(selector)) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  closest(selector) {
    let node = this;
    while (node !== null && node !== undefined) {
      if (node.matches?.(selector) === true) return node;
      node = node.parentElement;
    }
    return null;
  }

  addEventListener(type, listener) {
    const list = this.listeners.get(type) ?? [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  removeEventListener(type, listener) {
    const list = this.listeners.get(type) ?? [];
    const index = list.indexOf(listener);
    if (index >= 0) list.splice(index, 1);
  }

  /** Test-only: dispatch to this element's own listeners. */
  dispatch(type, event = {}) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener({ type, target: this, ...event });
  }

  click() {
    this.dispatch("click", { preventDefault() {}, stopPropagation() {} });
  }

  focus() {}

  getBoundingClientRect() {
    return { width: 240, height: 36, top: 100, left: 0, right: 240, bottom: 136 };
  }

  get offsetWidth() {
    return 200;
  }

  get offsetHeight() {
    return 150;
  }
}

class Fragment extends El {
  constructor() {
    super("#fragment");
    this.content = this;
  }
}

class Document extends El {
  constructor() {
    super("#document");
    this.documentElement = this.appendChild(new El("html"));
    this.head = this.documentElement.appendChild(new El("head"));
    this.body = this.documentElement.appendChild(new El("body"));
    this.listeners = new Map();
  }

  createElement(tag) {
    return tag === "template" ? new Fragment() : new El(tag);
  }
}

const globals = {
  document: new Document(),
  localStorage: new Map(),
};
//#endregion

//#region globals the plugin expects
globalThis.Node = DomNode;
globalThis.HTMLElement = El;
/** Observers the plugin installs; `flushMutations()` replays their callback. */
const observers = [];
globalThis.MutationObserver = class {
  constructor(callback) {
    this.callback = callback;
    observers.push(this);
  }
  observe() {}
  disconnect() {
    const index = observers.indexOf(this);
    if (index >= 0) observers.splice(index, 1);
  }
};
/** Test-only: stand in for the browser delivering a batch of DOM mutations. */
function flushMutations() {
  for (const observer of [...observers]) observer.callback([], observer);
}
/**
 * Frames the plugin queued. Browsers deliver `requestAnimationFrame` later, so
 * the shim must too: running the callback synchronously would assign
 * `runtime.raf` after `sync` had already cleared it, wedging the scheduler.
 */
const frames = new Map();
let nextFrameId = 1;
globalThis.requestAnimationFrame = (fn) => {
  const id = nextFrameId++;
  frames.set(id, fn);
  return id;
};
globalThis.cancelAnimationFrame = (id) => {
  frames.delete(id);
};
/** Test-only: run every queued frame, in order, until the queue drains. */
function flushFrames() {
  for (let guard = 0; guard < 20 && frames.size > 0; guard += 1) {
    const batch = [...frames.entries()];
    frames.clear();
    for (const [, fn] of batch) fn(0);
  }
}
/** Hosts whose list the fake host reports as collapsed (Windows titlebar mode). */
const collapsedHosts = new Set();
globalThis.getComputedStyle = (node) => ({ display: collapsedHosts.has(node) ? "none" : "flex" });
globalThis.window = {
  innerWidth: 1280,
  innerHeight: 800,
  addEventListener() {},
  removeEventListener() {},
  getComputedStyle: globalThis.getComputedStyle,
  localStorage: {
    getItem: (key) => (globals.localStorage.has(key) ? globals.localStorage.get(key) : null),
    setItem: (key, value) => globals.localStorage.set(key, value),
  },
};
globalThis.document = globals.document;

/** Load the plugin's factory through a minimal ModuleLoader shim. */
function loadPlugin() {
  let exported;
  globalThis.window.__ModuleLoader__ = {
    load({ factory }) {
      exported = factory(() => {
        throw new Error("unexpected require() in the browser half");
      });
    },
  };
  const source = readFileSync(join(here, "..", "src", "client.js"), "utf8");
  new Function(source)();
  return exported;
}
//#endregion

//#region fixtures
/**
 * Build the sidebar shape the plugin anchors on: a column holding the panel
 * list nav, whose rows each carry a `[data-slot="sidebar.panellist"]` anchor.
 * @param {{label:string, active?:boolean}[]} panels
 */
function buildSidebar(panels) {
  const document = globals.document;
  document.body.children.length = 0;
  const column = document.body.appendChild(new El("div"));
  const nav = column.appendChild(new El("nav"));
  nav.setAttribute("aria-label", "全局面板");
  for (const panel of panels) {
    const row = nav.appendChild(new El("button"));
    row.setAttribute("aria-label", panel.label);
    if (panel.active === true) row.setAttribute("aria-current", "page");
    const glyph = row.appendChild(new El("span"));
    const anchor = glyph.appendChild(new El("span"));
    anchor.setAttribute("data-slot", "sidebar.panellist");
    anchor.innerHTML = `<svg data-icon="${panel.label}"></svg>`;
    if (panel.active !== true) continue;
    const title = row.appendChild(new El("span"));
    title.textContent = panel.label;
  }
  return { column, nav };
}

/** Minimal Cordis-ish context. */
function createContext() {
  const effects = [];
  const cleanups = [];
  const form = {
    value: { folded: false },
    listeners: new Set(),
    getSnapshot() {
      return { status: "ready", value: this.value, revision: 1, writable: true };
    },
    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    },
    set(field, value) {
      this.value = { ...this.value, [field]: value };
      for (const listener of [...this.listeners]) listener();
      return Promise.resolve(true);
    },
  };
  const ctx = {
    effect(fn, label) {
      effects.push(label);
      const off = fn();
      if (typeof off === "function") cleanups.push(off);
      return off;
    },
    locale: {
      register() {
        return () => {};
      },
      bind() {
        return (key, params) => (params === undefined ? key : `${key}:${params.name ?? ""}`);
      },
    },
    inject(_deps, callback) {
      callback({ ...ctx, configForms: { get: () => form } });
    },
    get(name) {
      return name === "configForms" ? { get: () => form } : undefined;
    },
  };
  return { ctx, form, effects, cleanups };
}
//#endregion

//#region assertions
const plugin = loadPlugin();
assert.equal(typeof plugin.apply, "function", "client.js must export apply");
assert.deepEqual(plugin.inject, ["locale"], "only locale is a hard dependency");

const { column, nav } = buildSidebar([
  { label: "插件", active: true },
  { label: "定时任务" },
  { label: "上下文" },
]);

const { ctx, form, cleanups } = createContext();
plugin.apply(ctx);
flushFrames(); // the plugin mounts on its first animation frame

const root = column.children[0];
assert.ok(root !== undefined, "the plugin must insert its own row container");
assert.equal(root.className, "dsh-spf");
assert.equal(root.nextElementSibling, nav, "the row must sit immediately before the nav");

const row = root.querySelector("button");
assert.equal(row.getAttribute("data-variant"), "toggle", "the row starts as the collapse toggle");
assert.equal(row.getAttribute("aria-label"), "fold.label");

// Fold.
row.click();
assert.ok(nav.classList.contains("dsh-spf-folded"), "folding hides the built-in nav");
assert.equal(row.getAttribute("data-variant"), "summary", "the row becomes the summary");
assert.equal(form.value.folded, true, "the fold state is persisted through configForms");
assert.equal(root.querySelector(".dsh-spf-label").textContent, "插件", "the summary shows the active panel");

// Unfold by clicking the summary: first click opens the popover.
row.click();
const menu = globals.document.body.querySelector(".dsh-spf-menu");
assert.ok(menu !== null, "clicking the summary opens the popover");
assert.equal(menu.getAttribute("role"), "menu");
const items = menu.querySelectorAll("button");
assert.equal(items.length, 4, "three panels plus the expand action");
assert.equal(items[0].getAttribute("aria-checked"), "true", "the active panel is marked");

// Selecting another panel delegates to the built-in row.
let switched = false;
nav.querySelectorAll("button")[1].click = () => {
  switched = true;
};
items[1].click();
assert.equal(switched, true, "the popover hands the switch back to the built-in row");
assert.equal(globals.document.body.querySelector(".dsh-spf-menu"), null, "the popover closes after a choice");
assert.ok(nav.classList.contains("dsh-spf-folded"), "picking a panel keeps the list folded");

// Unfold from the popover's action.
row.click();
globals.document.body.querySelectorAll(".dsh-spf-menu button").at(-1).click();
assert.equal(nav.classList.contains("dsh-spf-folded"), false, "the expand action restores the list");
assert.equal(form.value.folded, false);

// When the host hides the list itself (Windows titlebar rail), mirror it instead
// of leaving a lone control behind.
collapsedHosts.add(nav);
row.click();
assert.ok(
  column.children[0].classList.contains("dsh-spf-hidden"),
  "the plugin's row hides with an officially hidden list",
);
collapsedHosts.delete(nav);
row.click();
globals.document.body.querySelectorAll(".dsh-spf-menu button").at(-1).click();
assert.ok(
  column.children[0].classList.contains("dsh-spf-hidden") === false,
  "the plugin's row returns when the host shows the list again",
);

// Panels come and go while the app runs (installing a plugin registers a new
// `sidebar.panellist` entry). The row and the popover must follow the live list.
const addPanel = (label) => {
  const row = nav.appendChild(new El("button"));
  row.setAttribute("aria-label", label);
  const glyph = row.appendChild(new El("span"));
  const anchor = glyph.appendChild(new El("span"));
  anchor.setAttribute("data-slot", "sidebar.panellist");
  anchor.innerHTML = `<svg data-icon="${label}"></svg>`;
  row.appendChild(new El("span"));
  flushMutations();
  flushFrames();
  return row;
};

row.click();
addPanel("市场");
addPanel("技能");
row.click();
const grown = globals.document.body.querySelectorAll(".dsh-spf-menu button");
assert.equal(grown.length, 6, "two added panels show up in the popover (4 panels + expand)");
assert.equal(grown[4].getAttribute("aria-checked"), "false", "a fresh panel is not marked active");
row.click(); // close through the plugin's own path

// A panel disappearing must not leave a stale entry behind.
nav.querySelectorAll("button")[1].remove();
flushMutations();
flushFrames();
row.click();
const shrunk = globals.document.body.querySelectorAll(".dsh-spf-menu button");
assert.equal(shrunk.length, 5, "a removed panel drops out of the popover (3 panels + expand)");
row.click();

// The summary follows the active panel even when that panel is the one that changed.
const activeRow = nav.querySelectorAll("button")[0];
activeRow.removeAttribute("aria-current");
nav.querySelectorAll("button").at(-1).setAttribute("aria-current", "page");
flushMutations();
flushFrames();
assert.equal(
  root.querySelector(".dsh-spf-label").textContent,
  "技能",
  "the summary tracks the newly active panel",
);

// Losing the active panel must fall back to another one, not to a blank label.
const activeRow2 = nav.querySelectorAll("button").find((node) => node.getAttribute("aria-current") === "page");
activeRow2.remove();
flushMutations();
flushFrames();
assert.equal(
  root.querySelector(".dsh-spf-label").textContent,
  "插件",
  "removing the active panel falls back to the first remaining panel",
);

// The official sidebar renders the nav only while panels exist. When the last
// one goes away the plugin must take its own row with it.
for (const node of [...nav.querySelectorAll("button")]) node.remove();
nav.remove();
flushMutations();
flushFrames();
assert.equal(column.children.length, 0, "with no panel list left, the plugin leaves nothing behind");

// …and it must come back when the list reappears (e.g. a plugin is installed).
const revived = column.appendChild(new El("nav"));
revived.setAttribute("aria-label", "全局面板");
const revivedRow = revived.appendChild(new El("button"));
revivedRow.setAttribute("aria-label", "插件");
revivedRow.setAttribute("aria-current", "page");
const revivedGlyph = revivedRow.appendChild(new El("span"));
const revivedAnchor = revivedGlyph.appendChild(new El("span"));
revivedAnchor.setAttribute("data-slot", "sidebar.panellist");
revivedAnchor.innerHTML = `<svg data-icon="插件"></svg>`;
revivedRow.appendChild(new El("span"));
flushMutations();
flushFrames();
assert.equal(column.children.length, 2, "the plugin re-anchors when a new panel list appears");
assert.equal(column.children[1], revived, "its row still sits immediately before the nav");

// Teardown leaves no trace.
for (const cleanup of cleanups.reverse()) cleanup();
assert.equal(column.children.length, 1, "only the built-in nav remains");
assert.equal(globals.document.head.children.length, 0, "the stylesheet is removed");

console.log("smoke: ok");
//#endregion
