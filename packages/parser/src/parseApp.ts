import { collectModuleErrors } from "./modules/collectModuleErrors.js";
import { resetUniqueIdCounter } from "./modules/getUniqueId.js";
import type { ParsedApp, SourceFile } from "./modules/interfaces.js";
import { parseFile } from "./modules/parseFile.js";

export function parseApp(files: SourceFile[]) {
  resetUniqueIdCounter();

  const app: ParsedApp = {
    appType: "app",
    modules: new Map(),
    files,
    constants: new Map(),
    i18nKeys: new Set<string>(),
    errors: [],
  };

  parseFile("/index.tsx", app);

  collectModuleErrors(app);

  return app;
}
