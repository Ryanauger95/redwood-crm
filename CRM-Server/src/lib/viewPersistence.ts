const KEY_PREFIX = "homevale_last_view_";

export function getLastViewId(entity: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY_PREFIX + entity);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

export function setLastViewId(entity: string, id: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_PREFIX + entity, String(id));
}
