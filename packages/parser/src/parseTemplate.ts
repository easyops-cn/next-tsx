import { collectModuleErrors } from "./modules/collectModuleErrors.js";
import { resetUniqueIdCounter } from "./modules/getUniqueId.js";
import type { ParsedApp } from "./modules/interfaces.js";
import { parseFile } from "./modules/parseFile.js";

export function parseTemplate(source: string): ParsedApp {
  resetUniqueIdCounter();

  const app: ParsedApp = {
    appType: "template",
    modules: new Map(),
    files: [
      {
        filePath: "/Template.tsx",
        content: source,
      },
    ],
    cssFiles: new Map(),
    imageFiles: new Set(),
    i18nKeys: new Set<string>(),
    contracts: new Set<string>(),
    errors: [],
  };

  parseFile("/Template.tsx", app);

  collectModuleErrors(app);

  return app;
}
