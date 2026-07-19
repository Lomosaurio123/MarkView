export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join("/"));
}

export function getRelativePath(from: string, to: string): string {
  const fromParts = normalizePath(from).split("/").filter(Boolean);
  const toParts = normalizePath(to).split("/").filter(Boolean);
  
  let commonLength = 0;
  while (commonLength < fromParts.length && commonLength < toParts.length && fromParts[commonLength] === toParts[commonLength]) {
    commonLength++;
  }
  
  const up = fromParts.length - commonLength;
  const down = toParts.slice(commonLength);
  
  return normalizePath("../".repeat(up) + down.join("/"));
}

export function getBasename(path: string): string {
  return normalizePath(path).split("/").pop() || "";
}

export function getDirname(path: string): string {
  const parts = normalizePath(path).split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

export function getExtension(path: string): string {
  const basename = getBasename(path);
  const idx = basename.lastIndexOf(".");
  return idx >= 0 ? basename.slice(idx + 1) : "";
}

export function withoutExtension(path: string): string {
  const ext = getExtension(path);
  return ext ? path.slice(0, -ext.length - 1) : path;
}

export function isAbsolutePath(path: string): boolean {
  return /^[A-Za-z]:\\|^\\\\|^\//.test(path);
}

export function ensureExtension(path: string, ext: string): string {
  const current = getExtension(path);
  return current ? path : `${path}.${ext}`;
}