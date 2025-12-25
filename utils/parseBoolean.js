export function parseBoolean(value) {
  if (value === null) return null;

  return value === "true";
}
