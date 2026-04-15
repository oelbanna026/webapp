const STORAGE_KEY = "stadium_os:asset_overrides:v1";

export function loadAssetOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveAssetOverrides(overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides || {}));
}

export function clearAssetOverrides() {
  localStorage.removeItem(STORAGE_KEY);
}

