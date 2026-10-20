window.__ModuleLoader__.load({
  id: "dsh-sidebar-panel-fold",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    /**
     * Browser half of dsh-sidebar-panel-fold.
     *
     * The sidebar's global panel list (the `nav` inside the sidebar) is rendered
     * exclusively by SidebarRoot: the `sidebar.panellist` slot only produces one
     * PanelRow per registered panel, so no official seam wraps the whole list.
     * This half therefore anchors on two stable facts guaranteed by the renderer
     * and the sidebar:
     *
     *   1. `[data-slot="sidebar.panellist"]` — emitted by SlotOutlet for every
     *      list entry, with `display: contents` so it never joins layout;
     *   2. the `nav` element containing it — the panel list container.
     *
     * It then owns exactly one sibling element placed *before* that `nav` (never
     * inside React's child list) plus a stylesheet that can hide the `nav`.
     */

    //#region constants
    /** Locale namespace for this plugin's strings. */
    const NS = "sidebar-panel-fold";
    /** Host settings namespace; must equal the profile entry id. */
    const SETTINGS_NS = "dsh-sidebar-panel-fold";
    /** Boolean field on the Host settings document. */
    const FOLDED_FIELD = "folded";
    /** Fallback key when the Host settings channel is unavailable. */
    const STORAGE_KEY = "dsh-sidebar-panel-fold:v1";
    /** Renderer anchor for the panel list slot. */
    const SLOT = "sidebar.panellist";
    /** Classes owned by this plugin. */
    const CLS_ROOT = "dsh-spf";
    const CLS_FOLDED = "dsh-spf-folded";
    const CLS_ROW = "dsh-spf-row";
    const CLS_ROW_ICON = "dsh-spf-icon";
    const CLS_ROW_LABEL = "dsh-spf-label";
    const CLS_ROW_CARET = "dsh-spf-caret";
    const CLS_MENU = "dsh-spf-menu";
    const CLS_ITEM = "dsh-spf-item";
    const CLS_ITEM_ICON = "dsh-spf-item-icon";
    const CLS_ITEM_LABEL = "dsh-spf-item-label";
    const CLS_ITEM_ACTIVE = "dsh-spf-item-active";
    const CLS_SEP = "dsh-spf-sep";
    const CLS_RAIL = "dsh-spf-rail";
    const CLS_HIDDEN = "dsh-spf-hidden";
    /** Version banner, matching the sibling plugins' convention. */
    const VERSION = "0.1.0";
    const CARET_DOWN =
      '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6.5 8 10.5 12 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const CARET_UP =
      '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 10.5 8 6l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    //#endregion

    //#region dictionaries
    const zh = {
      "fold.label": "收起面板",
      "fold.hint": "把全局面板收纳成一行",
      "unfold.label": "展开面板",
      "unfold.hint": "恢复完整的面板列表",
      "summary.label": "面板",
      "summary.hint": "当前面板：{name}。点击选择其他面板",
      "menu.label": "全局面板",
      "menu.unfold": "展开面板",
      "empty": "没有可切换的面板",
    };
    const en = {
      "fold.label": "Collapse panels",
      "fold.hint": "Fold the global panels into one row",
      "unfold.label": "Expand panels",
      "unfold.hint": "Restore the full panel list",
      "summary.label": "Panels",
      "summary.hint": "Current panel: {name}. Click to choose another",
      "menu.label": "Global panels",
      "menu.unfold": "Expand panels",
      "empty": "No panels to switch to",
    };
    //#endregion

    //#region styles
    const CSS = `
.${CLS_ROOT}{
  box-sizing:border-box;flex:none;display:flex;flex-direction:column;gap:4px;
  margin-bottom:2px;position:relative;min-width:0
}
.${CLS_ROOT} *{box-sizing:border-box}

.${CLS_ROW}{
  box-sizing:border-box;width:100%;min-height:28px;margin:0 2px;padding:3px 8px;
  display:flex;align-items:center;gap:8px;border:0;border-radius:var(--dsw-radius-md);
  background:0 0;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:12px;
  line-height:18px;text-align:left;cursor:pointer;user-select:none
}
.${CLS_ROW}:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.${CLS_ROW}:focus-visible{
  outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#4c6ef5))
}
.${CLS_ROW_ICON}{
  flex:none;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;
  color:currentColor
}
.${CLS_ROW_ICON} > svg{width:16px;height:16px;display:block}
.${CLS_ROW_LABEL}{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.${CLS_ROW_CARET}{
  flex:none;width:12px;height:12px;display:inline-flex;align-items:center;justify-content:center;
  opacity:.75;transition:transform .12s ease
}
.${CLS_ROW_CARET} > svg{width:12px;height:12px;display:block}
.${CLS_ROOT}[data-open="true"] .${CLS_ROW_CARET}{transform:rotate(180deg)}

/* summary row keeps the active panel's own glyph and metrics */
.${CLS_ROW}[data-variant="summary"]{
  color:var(--dsw-alias-label-primary);font-weight:500;min-height:36px;
  padding:7px 8px;font-size:inherit;line-height:22px
}
.${CLS_ROW}[data-variant="summary"] .${CLS_ROW_ICON},
.${CLS_ROW}[data-variant="summary"] .${CLS_ROW_ICON} > svg{width:18px;height:18px}
.${CLS_ROW}[data-variant="summary"] .${CLS_ROW_CARET}{color:var(--dsw-alias-label-tertiary)}

/* rail (icon-only) mode mirrors the built-in PanelRow geometry */
.${CLS_RAIL} .${CLS_ROW}{
  width:36px;height:36px;min-height:36px;justify-content:center;margin:0;padding:0;gap:0
}
.${CLS_RAIL} .${CLS_ROW} .${CLS_ROW_LABEL},
.${CLS_RAIL} .${CLS_ROW} .${CLS_ROW_CARET}{display:none}

/* the folded list itself: hide the rows, never the container, so the plugin can
   still tell an officially hidden list apart from its own folding */
nav.${CLS_FOLDED}{margin-bottom:0!important}
nav.${CLS_FOLDED} > *{display:none!important}

/* popover */
.${CLS_MENU}{
  position:fixed;z-index:80;min-width:184px;max-width:288px;max-height:60vh;overflow:auto;
  padding:4px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;
  background:var(--dsw-specific-input-major,var(--dsw-alias-bg-base));
  box-shadow:var(--dsw-shadow-lv2,var(--dsw-shadow-lv1));color:var(--dsw-alias-label-primary);
  display:flex;flex-direction:column;gap:2px;
  --dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2)
}
.${CLS_ITEM}{
  box-sizing:border-box;width:100%;min-height:32px;padding:5px 8px;display:flex;align-items:center;gap:8px;
  border:0;border-radius:8px;background:0 0;color:inherit;font:inherit;font-size:13px;line-height:20px;
  text-align:left;cursor:pointer
}
.${CLS_ITEM}:hover{background:var(--dsw-alias-interactive-bg-hover)}
.${CLS_ITEM}:focus-visible{
  outline:none;box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#4c6ef5))
}
.${CLS_ITEM_ICON}{flex:none;width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center}
.${CLS_ITEM_ICON} > svg{width:16px;height:16px;display:block}
.${CLS_ITEM_LABEL}{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.${CLS_ITEM_ACTIVE}{background:var(--dsw-alias-interactive-bg-hover);font-weight:500}
.${CLS_ITEM_ACTIVE}::after{
  content:"";flex:none;width:5px;height:5px;border-radius:50%;
  background:var(--dsw-alias-state-business-primary,#4c6ef5)
}
.${CLS_SEP}{flex:none;height:1px;margin:2px 4px;background:var(--dsw-alias-border-l2)}

/* the official list hides itself in some rail layouts; mirror that instead of
   leaving a lone control behind */
.${CLS_HIDDEN}{display:none!important}

@media (prefers-reduced-motion:reduce){
  .${CLS_ROW_CARET}{transition:none}
}
`;
    //#endregion

    //#region dom helpers
    /**
     * The panel list container: the `nav` holding the panellist slot anchor.
     * The plugin's own summary row reuses the active panel's glyph markup, so the
     * query must skip any anchor that is not inside a nav (our clone).
     * @returns {HTMLElement|null}
     */
    function findNav() {
      for (const anchor of document.querySelectorAll(`[data-slot="${SLOT}"]`)) {
        const nav = anchor.closest("nav");
        if (nav !== null) return nav;
      }
      return null;
    }

    /**
     * Strip the renderer's slot anchors from cloned glyph markup: a duplicated
     * `[data-slot]` outside a nav would otherwise shadow the real one.
     * @param {string} html
     * @returns {string}
     */
    function sanitizeGlyph(html) {
      if (html === "") return "";
      const template = document.createElement("template");
      template.innerHTML = html;
      for (const node of template.content.querySelectorAll("[data-slot]")) node.removeAttribute("data-slot");
      return template.innerHTML;
    }

    /**
     * Sanitized glyph per host element, invalidated when its raw markup changes.
     * The sidebar re-renders on every streamed token, so cloning an unchanged
     * glyph would otherwise re-parse the same SVG once per animation frame.
     * @type {WeakMap<Element, {raw: string, clean: string}>}
     */
    const glyphCache = new WeakMap();

    /** @param {Element|null|undefined} host @returns {string} */
    function glyphOf(host) {
      if (host === null || host === undefined) return "";
      const raw = host.innerHTML;
      const cached = glyphCache.get(host);
      if (cached !== undefined && cached.raw === raw) return cached.clean;
      const clean = sanitizeGlyph(raw);
      glyphCache.set(host, { raw, clean });
      return clean;
    }

    /**
     * Whether the sidebar renders the icon-only rail. In wide mode PanelRow
     * renders a second span (the panel title); in rail mode it renders the glyph
     * only, so the child count is a structural, hash-free signal.
     * @param {HTMLElement} nav
     * @returns {boolean}
     */
    function isRail(nav) {
      const row = nav.querySelector("button");
      if (row === null) return false;
      if (row.children.length > 0) return row.children.length < 2;
      const width = nav.getBoundingClientRect().width;
      return width > 0 && width < 140;
    }

    /**
     * Snapshot of the panels the built-in list currently shows.
     * @param {HTMLElement} nav
     * @returns {{row:HTMLElement,label:string,glyph:string,active:boolean}[]}
     */
    function readPanels(nav) {
      const out = [];
      for (const row of nav.querySelectorAll("button")) {
        const anchor = row.querySelector(`[data-slot="${SLOT}"]`);
        if (anchor === null) continue;
        const glyphHost = row.querySelector("span");
        out.push({
          row,
          label: row.getAttribute("aria-label") ?? row.textContent?.trim() ?? "",
          glyph: glyphOf(glyphHost),
          active: row.getAttribute("aria-current") === "page",
        });
      }
      return out;
    }

    /**
     * Whether the built-in list is hidden by the host itself (Windows titlebar
     * mode collapses the whole rail). Measured on the container, never on the
     * rows, so the plugin's own folding cannot be mistaken for it.
     * @param {HTMLElement} nav
     * @returns {boolean}
     */
    function isOfficiallyHidden(nav) {
      if (typeof window.getComputedStyle !== "function") return false;
      const style = window.getComputedStyle(nav);
      return style !== null && style !== undefined && style.display === "none";
    }
    //#endregion

    /** @param {*} ctx */
    function apply(ctx) {
      //#region i18n
      let t = (key, params) => {
        const template = zh[key] ?? key;
        return params === void 0
          ? template
          : template.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
      };
      try {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), "sidebar-panel-fold: dictionaries");
        t = ctx.locale.bind(NS);
      } catch (error) {
        console.warn("[dsh-sidebar-panel-fold] locale unavailable, using the built-in zh strings", error);
      }
      //#endregion

      //#region state
      /**
       * Fold state backed by the Host settings document, with a localStorage
       * fallback for deployments that do not compose the settings client.
       */
      const state = {
        folded: false,
        /** @type {{getSnapshot:Function,subscribe:Function,set:Function}|null} */
        form: null,
        listeners: new Set(),
        get() {
          return this.folded;
        },
        /** @param {boolean} next */
        async set(next) {
          if (this.folded === next) return;
          this.folded = next;
          this.emit();
          if (this.form !== null) {
            try {
              await this.form.set(FOLDED_FIELD, next);
            } catch (error) {
              console.warn("[dsh-sidebar-panel-fold] could not persist the fold state", error);
            }
            return;
          }
          try {
            window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
          } catch {
            /* private mode or disabled storage: keep the in-memory value */
          }
        },
        /** @param {() => void} listener @returns {() => void} */
        subscribe(listener) {
          this.listeners.add(listener);
          return () => this.listeners.delete(listener);
        },
        emit() {
          for (const listener of [...this.listeners]) {
            try {
              listener();
            } catch (error) {
              console.error("[dsh-sidebar-panel-fold] listener failed", error);
            }
          }
        },
      };

      // Seed from the fallback first: a Host value that arrives later wins, so a
      // stale localStorage entry can never shadow the real setting.
      try {
        state.folded = window.localStorage.getItem(STORAGE_KEY) === "1";
      } catch {
        /* private mode or disabled storage: stay on the default */
      }

      const adopt = () => {
        const form = state.form;
        if (form === null) return;
        const value = form.getSnapshot()?.value;
        if (value === null || typeof value !== "object") return;
        const next = value[FOLDED_FIELD] === true;
        if (next === state.folded) return;
        state.folded = next;
        state.emit();
      };

      try {
        ctx.inject(["configForms"], (child) => {
          child.effect(() => {
            const form = child.configForms.get(SETTINGS_NS);
            state.form = form;
            const off = form.subscribe(adopt);
            adopt();
            return () => {
              state.form = null;
              off();
            };
          }, "sidebar-panel-fold: settings form");
        });
      } catch (error) {
        console.warn("[dsh-sidebar-panel-fold] configForms unavailable, falling back to localStorage", error);
      }
      //#endregion

      //#region styles
      ctx.effect(() => {
        const tag = document.createElement("style");
        tag.dataset.dshSpfCss = VERSION;
        tag.textContent = CSS;
        document.head.appendChild(tag);
        return () => tag.remove();
      }, "sidebar-panel-fold: styles");
      //#endregion

      //#region runtime
      const runtime = {
        /** @type {HTMLElement|null} */
        nav: null,
        /** @type {HTMLElement|null} */
        root: null,
        /** @type {HTMLElement|null} */
        row: null,
        /** @type {HTMLElement|null} */
        menu: null,
        /** signature of the last rendered derivation */
        signature: "",
        /** @type {number|null} */
        raf: null,
        /** @type {number|null} */
        menuRaf: null,
      };

      const closeMenu = () => {
        runtime.menu?.remove();
        runtime.menu = null;
        if (runtime.root?.getAttribute("data-open") === "true") runtime.root.setAttribute("data-open", "false");
        // Only the folded summary row owns `aria-expanded`; the plain toggle row
        // must not advertise a popup it does not have.
        if (runtime.row?.getAttribute("aria-haspopup") === "menu") runtime.row.setAttribute("aria-expanded", "false");
      };

      /** Position the popover beside the summary row, flipping when it would overflow. */
      const placeMenu = () => {
        const menu = runtime.menu;
        const row = runtime.row;
        if (menu === null || row === null) return;
        const rect = row.getBoundingClientRect();
        const width = menu.offsetWidth;
        const height = menu.offsetHeight;
        const gap = 6;
        let left = rect.right + gap;
        if (left + width > window.innerWidth - 8) left = Math.max(8, rect.left - width - gap);
        let top = rect.top;
        if (top + height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - height - 8);
        menu.style.left = `${Math.round(left)}px`;
        menu.style.top = `${Math.round(top)}px`;
      };

      const buildMenu = () => {
        const nav = runtime.nav;
        if (nav === null) return null;
        const menu = document.createElement("div");
        menu.className = CLS_MENU;
        menu.setAttribute("role", "menu");
        menu.setAttribute("aria-label", t("menu.label"));
        const panels = readPanels(nav);
        if (panels.length === 0) {
          const empty = document.createElement("div");
          empty.className = CLS_ITEM;
          empty.textContent = t("empty");
          menu.appendChild(empty);
        }
        for (const panel of panels) {
          const item = document.createElement("button");
          item.type = "button";
          item.className = panel.active ? `${CLS_ITEM} ${CLS_ITEM_ACTIVE}` : CLS_ITEM;
          item.setAttribute("role", "menuitemradio");
          item.setAttribute("aria-checked", panel.active ? "true" : "false");
          const icon = document.createElement("span");
          icon.className = CLS_ITEM_ICON;
          icon.setAttribute("aria-hidden", "true");
          icon.innerHTML = panel.glyph;
          const label = document.createElement("span");
          label.className = CLS_ITEM_LABEL;
          label.textContent = panel.label;
          item.append(icon, label);
          item.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            // Hand the switch back to the built-in row so DSH's own selectPanel
            // path (analytics included) stays authoritative.
            const target = panel.row.isConnected ? panel.row : null;
            closeMenu();
            target?.click();
          });
          menu.appendChild(item);
        }
        if (panels.length > 0) {
          const separator = document.createElement("div");
          separator.className = CLS_SEP;
          separator.setAttribute("role", "separator");
          menu.appendChild(separator);
          const unfold = document.createElement("button");
          unfold.type = "button";
          unfold.className = CLS_ITEM;
          unfold.setAttribute("role", "menuitem");
          const unfoldIcon = document.createElement("span");
          unfoldIcon.className = CLS_ITEM_ICON;
          unfoldIcon.setAttribute("aria-hidden", "true");
          unfoldIcon.innerHTML = CARET_UP;
          const unfoldLabel = document.createElement("span");
          unfoldLabel.className = CLS_ITEM_LABEL;
          unfoldLabel.textContent = t("menu.unfold");
          unfold.append(unfoldIcon, unfoldLabel);
          unfold.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            closeMenu();
            void state.set(false);
          });
          menu.appendChild(unfold);
        }
        return menu;
      };

      const openMenu = () => {
        closeMenu();
        const menu = buildMenu();
        if (menu === null) return;
        runtime.menu = menu;
        document.body.appendChild(menu);
        placeMenu();
        if (runtime.root?.getAttribute("data-open") !== "true") runtime.root?.setAttribute("data-open", "true");
        runtime.row?.setAttribute("aria-expanded", "true");
        menu.querySelector("button")?.focus({ preventScroll: true });
      };

      const onDocumentPointerDown = (event) => {
        if (runtime.menu === null) return;
        const target = event.target;
        if (!(target instanceof Node)) return;
        if (runtime.menu.contains(target) || runtime.root?.contains(target) === true) return;
        closeMenu();
      };

      const onDocumentKeyDown = (event) => {
        if (event.key !== "Escape" || runtime.menu === null) return;
        event.stopPropagation();
        closeMenu();
        runtime.row?.focus({ preventScroll: true });
      };

      const onViewportChange = () => {
        if (runtime.menu !== null && runtime.menuRaf === null) {
          runtime.menuRaf = requestAnimationFrame(() => {
            runtime.menuRaf = null;
            placeMenu();
          });
        }
        schedule();
      };

      /** Create the plugin's own container; never inserted inside React's nav. */
      const createRoot = () => {
        const root = document.createElement("div");
        root.className = CLS_ROOT;
        root.setAttribute("data-dsh-spf", VERSION);
        const row = document.createElement("button");
        row.type = "button";
        row.className = CLS_ROW;
        row.setAttribute("data-variant", "toggle");
        const icon = document.createElement("span");
        icon.className = CLS_ROW_ICON;
        icon.setAttribute("aria-hidden", "true");
        const label = document.createElement("span");
        label.className = CLS_ROW_LABEL;
        const caret = document.createElement("span");
        caret.className = CLS_ROW_CARET;
        caret.setAttribute("aria-hidden", "true");
        caret.innerHTML = CARET_DOWN;
        row.append(icon, label, caret);
        row.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!state.get()) {
            void state.set(true);
            return;
          }
          if (runtime.menu === null) openMenu();
          else closeMenu();
        });
        root.appendChild(row);
        runtime.root = root;
        runtime.row = row;
        return root;
      };

      /** Write the row content for the current fold state (idempotent). */
      const renderRow = () => {
        const root = runtime.root;
        const row = runtime.row;
        const nav = runtime.nav;
        if (root === null || row === null || nav === null) return;
        const folded = state.get();
        const panels = readPanels(nav);
        const active = panels.find((panel) => panel.active) ?? panels[0];
        const icon = row.querySelector(`.${CLS_ROW_ICON}`);
        const label = row.querySelector(`.${CLS_ROW_LABEL}`);
        const caret = row.querySelector(`.${CLS_ROW_CARET}`);
        if (folded) {
          const name = active?.label ?? t("summary.label");
          const hint = t("summary.hint", { name });
          row.setAttribute("data-variant", "summary");
          row.setAttribute("aria-haspopup", "menu");
          if (row.getAttribute("aria-label") !== hint) row.setAttribute("aria-label", hint);
          if (row.title !== hint) row.title = hint;
          if (icon !== null && icon.innerHTML !== (active?.glyph ?? "")) icon.innerHTML = active?.glyph ?? "";
          if (label !== null && label.textContent !== name) label.textContent = name;
          if (caret !== null && caret.innerHTML !== CARET_DOWN) caret.innerHTML = CARET_DOWN;
        } else {
          const hint = t("fold.hint");
          row.setAttribute("data-variant", "toggle");
          if (row.hasAttribute("aria-haspopup")) row.removeAttribute("aria-haspopup");
          if (row.hasAttribute("aria-expanded")) row.removeAttribute("aria-expanded");
          if (row.getAttribute("aria-label") !== t("fold.label")) row.setAttribute("aria-label", t("fold.label"));
          if (row.title !== hint) row.title = hint;
          if (icon !== null && icon.innerHTML !== CARET_UP) icon.innerHTML = CARET_UP;
          if (label !== null && label.textContent !== t("fold.label")) label.textContent = t("fold.label");
        }
        const rail = isRail(nav);
        if (root.classList.contains(CLS_RAIL) !== rail) root.classList.toggle(CLS_RAIL, rail);
        // Some rail layouts (Windows titlebar mode) hide the official list with
        // `display:none` on the container. Mirror that so no lone control remains.
        const officialHidden = isOfficiallyHidden(nav);
        if (root.classList.contains(CLS_HIDDEN) !== officialHidden) root.classList.toggle(CLS_HIDDEN, officialHidden);
      };

      /** Apply the fold state to the built-in nav (idempotent). */
      const renderNav = () => {
        const nav = runtime.nav;
        if (nav === null) return;
        const folded = state.get();
        if (nav.classList.contains(CLS_FOLDED) !== folded) nav.classList.toggle(CLS_FOLDED, folded);
      };

      /** Signature of everything the row derivation depends on. */
      const signatureOf = () => {
        const nav = runtime.nav;
        if (nav === null) return "";
        const panels = readPanels(nav);
        return JSON.stringify([
          state.get(),
          isRail(nav),
          isOfficiallyHidden(nav),
          runtime.menu !== null,
          panels.map((panel) => [panel.label, panel.active, panel.glyph.length]),
        ]);
      };

      /** Re-derive and write only when something actually changed. */
      const refresh = (force) => {
        const signature = signatureOf();
        if (!force && signature === runtime.signature) return;
        runtime.signature = signature;
        renderRow();
        renderNav();
      };

      /** Mount or re-anchor, then refresh. Safe to call on every mutation. */
      const sync = () => {
        runtime.raf = null;
        const nav = findNav();
        if (nav === null) {
          closeMenu();
          runtime.root?.remove();
          runtime.nav = null;
          runtime.root = null;
          runtime.row = null;
          runtime.signature = "";
          return;
        }
        runtime.nav = nav;
        if (runtime.root === null || !runtime.root.isConnected) {
          const root = createRoot();
          nav.parentElement?.insertBefore(root, nav);
          runtime.signature = "";
        } else if (runtime.root.nextElementSibling !== nav) {
          // React re-created or moved the nav: re-anchor without touching it.
          nav.parentElement?.insertBefore(runtime.root, nav);
          runtime.signature = "";
        }
        // Not forced: the sidebar re-renders on every streamed token, and a
        // no-op refresh must stay free (mount/re-anchor cleared the signature).
        refresh(false);
      };

      const schedule = () => {
        if (runtime.raf !== null) return;
        runtime.raf = requestAnimationFrame(sync);
      };

      ctx.effect(() => {
        schedule();
        const offState = state.subscribe(() => {
          refresh(true);
          if (!state.get()) closeMenu();
        });

        const observer = new MutationObserver(schedule);
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["aria-current", "aria-label", "class", "data-sidebar-collapsed"],
        });

        document.addEventListener("pointerdown", onDocumentPointerDown, true);
        document.addEventListener("keydown", onDocumentKeyDown, true);
        window.addEventListener("resize", onViewportChange);
        window.addEventListener("scroll", onViewportChange, true);

        return () => {
          offState();
          observer.disconnect();
          document.removeEventListener("pointerdown", onDocumentPointerDown, true);
          document.removeEventListener("keydown", onDocumentKeyDown, true);
          window.removeEventListener("resize", onViewportChange);
          window.removeEventListener("scroll", onViewportChange, true);
          if (runtime.raf !== null) cancelAnimationFrame(runtime.raf);
          if (runtime.menuRaf !== null) cancelAnimationFrame(runtime.menuRaf);
          runtime.raf = null;
          runtime.menuRaf = null;
          closeMenu();
          runtime.nav?.classList.remove(CLS_FOLDED);
          runtime.root?.remove();
          runtime.nav = null;
          runtime.root = null;
          runtime.row = null;
          runtime.signature = "";
        };
      }, "sidebar-panel-fold: sidebar integration");
      //#endregion

      try {
        console.log(`[dsh-sidebar-panel-fold] client loaded v${VERSION}`);
      } catch {
        /* console may be patched; never fail the load */
      }
    }

    // Only `locale` is a hard requirement; configForms is injected dynamically
    // so the plugin still runs when a deployment omits the settings client.
    const inject = ["locale"];

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
