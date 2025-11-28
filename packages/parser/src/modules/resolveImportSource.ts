import type { SourceFile } from "./interfaces.js";

const resolveExtensions = [".js", ".jsx", ".ts", ".tsx"];

export function resolveImportSource(
  importSource: string,
  currentFilePath: string,
  files: SourceFile[]
): string {
  if (importSource.startsWith("@/")) {
    // Project root path
    return resolvePath(importSource.substring(1), files);
  }

  if (importSource.startsWith("./") || importSource.startsWith("../")) {
    // Relative path
    const currentDir = currentFilePath.substring(
      0,
      currentFilePath.lastIndexOf("/")
    );
    const segments = currentDir ? currentDir.split("/") : [""];
    const parts = importSource.split("/");
    for (const part of parts) {
      if (part === ".") {
        continue;
      } else if (part === "..") {
        if (segments.length > 0) {
          segments.pop();
        }
      } else {
        segments.push(part);
      }
    }
    return resolvePath(segments.join("/"), files);
  }

  if (importSource.startsWith("/")) {
    // Absolute path
    return resolvePath(importSource, files);
  }

  // Bare module specifier
  return importSource;
}

function resolvePath(path: string, files: SourceFile[]): string {
  if (files.some((f) => f.filePath === path)) {
    return path;
  }
  for (const ext of resolveExtensions) {
    if (files.some((f) => f.filePath === `${path}${ext}`)) {
      return `${path}${ext}`;
    }
  }
  return path;
}

export function isLocalImportSource(importSource: string): boolean {
  return (
    importSource.startsWith("@/") ||
    importSource.startsWith("./") ||
    importSource.startsWith("../") ||
    importSource.startsWith("/")
  );
}
