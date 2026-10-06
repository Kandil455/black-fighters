const DEFAULT_FLAGS = Object.freeze({
  summary_pipeline_v3: true,
  document_editor_v1: true,
  export_pipeline_v2: true,
  assistant_retrieval_v1: true,
});

function envValue(name) {
  try {
    return import.meta.env?.[`VITE_FEATURE_${name.toUpperCase()}`];
  } catch {
    return undefined;
  }
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return !["0", "false", "off", "disabled", "no"].includes(String(value).trim().toLowerCase());
}

/**
 * Build-time flags provide an emergency rollback without branching the UI.
 * A per-user/AdminConfig override can be passed by callers during staged rolls.
 */
export function isFeatureEnabled(name, overrides = null) {
  const fallback = DEFAULT_FLAGS[name] ?? false;
  const override = overrides && Object.prototype.hasOwnProperty.call(overrides, name)
    ? overrides[name]
    : undefined;
  return parseBoolean(override ?? envValue(name), fallback);
}

export function getFeatureFlags(overrides = null) {
  return Object.fromEntries(
    Object.keys(DEFAULT_FLAGS).map((name) => [name, isFeatureEnabled(name, overrides)]),
  );
}

export { DEFAULT_FLAGS };
