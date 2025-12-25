import type {
  BrickConfInTemplate,
  CustomTemplate,
  MetaI18n,
  StoryboardFunction,
} from "@next-core/types";
import {
  MODULE_SOURCE,
  type ParsedApp,
  isOfficialComponent,
} from "@next-tsx/parser";
import convertModule, {
  type ConvertedPartOfComponent,
} from "./convertModule.js";
import type {
  ConvertState,
  ConvertOptions,
  ConvertedApp,
} from "../interfaces.js";
import { getAppTplName } from "./getTplName.js";
import { convertRoutes } from "./convertRoutes.js";
import { getHelperFunctions } from "../helpers/index.js";
import { convertDataSource } from "./convertDataSource.js";

export async function convertApp(
  app: ParsedApp,
  options: ConvertOptions
): Promise<ConvertedApp> {
  const { entry, modules } = app;
  if (!entry) {
    throw new Error("No entry module found in the app.");
  }

  const render = entry.render;
  if (!render) {
    throw new Error("No render call found in the entry module.");
  }

  const { children } = render;

  if (children.length !== 1) {
    throw new Error(
      `Expects exactly one root component in the render call, but got ${children.length}.`
    );
  }

  const routesComponent = children[0];
  if (!isOfficialComponent(routesComponent, "Routes")) {
    throw new Error(
      `The root component must be <Routes> from "${MODULE_SOURCE}".`
    );
  }

  const state: ConvertState = {
    usedHelpers: new Set(),
    app,
    convertedModules: new Map(),
    errors: [],
  };

  const convertingEntry = convertModule(entry, state, options);
  state.convertedModules.set(entry.filePath, convertingEntry);

  const routes = await convertRoutes(
    routesComponent.children,
    state,
    entry,
    options,
    routesComponent.properties.menu
  );

  const functions: StoryboardFunction[] = [];
  const templates: CustomTemplate[] = [];

  // Some modules are not converted after routes being converted,
  // such as functions.
  for (const [filePath, mod] of modules) {
    if (!state.convertedModules.has(filePath)) {
      const convertedMod = convertModule(mod!, state, options);
      state.convertedModules.set(filePath, convertedMod);
    }
  }

  for (const mod of state.convertedModules.values()) {
    if (mod) {
      for (const part of [
        ...mod.internals,
        ...mod.namedExports.values(),
        mod.defaultExport,
      ]) {
        if (!part) {
          continue;
        }
        const { raw, promise } = part;
        switch (raw?.type) {
          case "function":
            functions.push(raw.function);
            break;
          case "template": {
            const part = (await promise) as ConvertedPartOfComponent;
            templates.push({
              name: getAppTplName(part.name!),
              bricks: part.bricks as BrickConfInTemplate[],
              state: part.context,
              proxy: part.proxy,
            });
            break;
          }
        }
      }
    }
  }

  const helpers = Array.from(state.usedHelpers).map<StoryboardFunction>(
    (name) => {
      const source = getHelperFunctions().get(name);
      if (!source) {
        throw new Error(`Helper function ${name} not found`);
      }
      return {
        name,
        source,
        typescript: true,
      };
    }
  );

  const menus: unknown[] = [];
  for (const menu of app.menus) {
    if (Array.isArray(menu.items)) {
      menus.push({
        ...menu.config,
        menuId: menu.menuId,
        items: menu.items,
        i18n: pickI18n(options.i18n, menu.i18nKeys),
      });
    } else {
      const { resolve } = convertDataSource(menu.items);
      menus.push({
        ...menu.config,
        menuId: menu.menuId,
        dynamicItems: true,
        itemsResolve: {
          ...resolve,
          ...(resolve?.transform
            ? {
                transform: {
                  items: menu.items.transform,
                },
              }
            : null),
          ...(resolve?.onReject
            ? {
                onReject: {
                  transform: { items: menu.items.rejectTransform },
                },
              }
            : null),
        },
        i18n: pickI18n(options.i18n, menu.i18nKeys),
      });
    }
  }

  return {
    routes,
    functions: [...functions, ...helpers],
    templates,
    errors: state.errors,
    menus,
  };
}

function pickI18n(
  i18n: MetaI18n | undefined,
  keys: Set<string>
): MetaI18n | undefined {
  if (!i18n || keys.size === 0) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(i18n).map(([key, value]) => [
      key,
      Object.fromEntries(Object.entries(value).filter(([k]) => keys.has(k))),
    ])
  );
}
