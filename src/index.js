/**
 * Host half of dsh-sidebar-panel-fold.
 *
 * It exists for exactly one reason: to declare a `folded` field on the Host
 * settings document so the browser half can remember the fold state across
 * restarts and across Web/Desktop launches. The `volatile()` wrapper is what
 * puts the field on the wire — only volatile fields are projected into the
 * settings form that `ctx.configForms` reads and writes.
 *
 * The schema library is imported dynamically, on purpose. A package installed
 * with `link:` is realpath'd out of the profile by Node's resolver, so a bare
 * static `import "@deepseek-ai/schemastery"` is resolved against the link
 * target's ancestors, finds nothing, and takes the whole entry down before
 * `apply()` ever runs — the plugin then never reaches the client module graph.
 * Importing lazily turns that into a degraded plugin (the sidebar row still
 * works, the state falls back to localStorage) instead of a dead one.
 */

/** Settings namespace, i.e. the profile entry id declared in cordis.patch.yml. */
const NS = "dsh-sidebar-panel-fold";

/** Field carrying the fold state. */
const FOLDED_FIELD = "folded";

/**
 * Resolve the schema library, or `undefined` when this install cannot reach it.
 * @returns {Promise<any>} the schemastery default export, or undefined.
 */
async function loadSchema() {
  try {
    const mod = await import("@deepseek-ai/schemastery");
    const z = mod?.default ?? mod;
    return typeof z?.object === "function" ? z : void 0;
  } catch (error) {
    console.warn(
      "[dsh-sidebar-panel-fold] @deepseek-ai/schemastery is not resolvable from this install " +
        "(a `link:` install does that — use `file:` instead); the fold state will fall back to localStorage",
      error,
    );
    return void 0;
  }
}

const z = await loadSchema();

/**
 * Durable schema: the wire envelope the browser scope validates against.
 * Undefined when the schema library is missing, which simply means this entry
 * exposes no settings form and the browser half uses its fallback store.
 */
const Config =
  z === void 0
    ? void 0
    : z.object({
        [FOLDED_FIELD]: z.boolean().default(false).volatile(),
      });

/**
 * Keep the plugin out of the auto-generated settings page: the only entry
 * point is the row injected into the sidebar itself.
 * @param ctx - Plugin context.
 */
function apply(ctx) {
  ctx.inject(["settings"], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });
}

export { Config, FOLDED_FIELD, NS, apply };
