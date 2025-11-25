import { parse, type ParseResult as BabelParseResult } from "@babel/parser";
import type * as t from "@babel/types";
import { parseModule } from "./parseModule.js";
import type {
  ModuleType,
  ParsedApp,
  ParseModuleOptions,
  ParsedModule,
} from "./interfaces.js";
import {
  CSS_EXTENSIONS,
  IMAGE_EXTENSIONS,
  SCRIPT_EXTENSIONS,
} from "./constants.js";

export interface SourceFile {
  filePath: string;
  content: string;
}

export function parseFile(
  filePath: string,
  app: ParsedApp,
  ast?: BabelParseResult<t.File> | undefined,
  options?: ParseModuleOptions
): void {
  const file = app.files.find((f) => f.filePath === filePath);
  if (!file) {
    throw new Error(`File not found: ${filePath}`);
  }

  if (app.modules.has(filePath)) {
    return;
  }

  app.modules.set(filePath, null);

  const isScript = SCRIPT_EXTENSIONS.some((ext) => file.filePath.endsWith(ext));
  const isCss =
    !isScript && CSS_EXTENSIONS.some((ext) => file.filePath.endsWith(ext));
  const isImage =
    !isScript &&
    !isCss &&
    IMAGE_EXTENSIONS.some((ext) => filePath.endsWith(ext));

  if (!ast && isScript) {
    try {
      ast = parse(file.content, {
        plugins: ["jsx", "typescript"],
        sourceType: "module",
        errorRecovery: true,
      });
    } catch (error) {
      app.errors.push({
        message: `Failed to parse file (${filePath}): ${error}`,
        node: null,
        severity: "fatal",
        filePath,
      });
      return;
    }
  }

  const isEntry = !app.entry;

  const moduleType: ModuleType = isEntry
    ? "entry"
    : isCss
      ? "css"
      : isImage
        ? "image"
        : !isScript
          ? "unknown"
          : file.filePath.startsWith("/Pages/")
            ? "page"
            : file.filePath.startsWith("/Components/")
              ? "template"
              : file.filePath.startsWith("/Utils/")
                ? "function"
                : "unknown";

  const mod: ParsedModule = {
    source: file.content,
    assetName: file.assetName,
    filePath,
    moduleType,
    defaultExport: null,
    namedExports: new Map(),
    internals: [],
    topLevelBindings: new Map(),
    errors: [],
    contracts: new Set(),
    usedHelpers: new Set(),
  };

  if (ast?.errors?.length) {
    for (const error of ast.errors) {
      mod.errors.push({
        message: `${error.code}: ${error.reasonCode}`,
        node: null,
        severity: "error",
      });
    }
  }

  if (isEntry) {
    app.entry = mod;
  }

  app.modules.set(filePath, mod);

  if (ast) {
    parseModule(mod, app, ast, options);
  } else if (isCss) {
    app.cssFiles.set(filePath, file.content);
  } else if (isImage) {
    app.imageFiles.add(filePath);
  }
}
