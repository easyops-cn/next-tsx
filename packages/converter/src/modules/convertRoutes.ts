import type { BrickConf, RouteConf } from "@next-core/types";
import {
  isOfficialComponent,
  type ComponentChild,
  type ComponentReference,
  type ParsedModule,
} from "@next-tsx/parser";
import type { ConvertedModule, ConvertingPart } from "./convertModule.js";
import type { ConvertOptions, ConvertState } from "../interfaces.js";
import convertModule from "./convertModule.js";

export async function convertRoutes(
  children: ComponentChild[] | undefined,
  state: ConvertState,
  currentModule: ParsedModule,
  options: ConvertOptions,
  parentMenu?: unknown
): Promise<RouteConf[]> {
  const routes = await Promise.all(
    children?.map(async (child) => {
      if (!isOfficialComponent(child, "Route")) {
        throw new Error(`All children of <Routes> must be <Route>.`);
      }
      const { path, component, menu } = child.properties;

      if (typeof path !== "string" || !path.startsWith("/")) {
        throw new Error(
          `The "path" property of <Route> must be a string starting with "/".`
        );
      }

      if (!component) {
        throw new Error(`The "component" property of <Route> is required.`);
      }

      const { reference, name: componentName } = component as ComponentChild & {
        reference: ComponentReference;
      };
      let convertingPage: ConvertingPart | null | undefined;

      const importSource =
        reference.type === "local"
          ? currentModule.filePath
          : reference.importSource!;

      let mod: ConvertedModule | null = null;
      if (state.convertedModules.has(importSource)) {
        mod = state.convertedModules.get(importSource)!;
      } else {
        const importedModule = state.app.modules.get(importSource);
        if (importedModule) {
          mod = convertModule(importedModule, state, options);
        }
        state.convertedModules.set(importSource, mod);
      }
      if (!mod) {
        throw new Error(
          `Cannot find the module "${reference.importSource}" imported by the route "${path}".`
        );
      }

      if (reference.type === "local") {
        const parts = [...mod.internals, ...mod.namedExports.values()];
        convertingPage = parts.find(
          ({ raw }) =>
            raw.type !== "function" &&
            raw.type !== "context" &&
            raw.type !== "constant" &&
            raw.component.id &&
            raw.component.id.name === reference.name
        );
      } else {
        convertingPage = reference.name
          ? mod.namedExports.get(reference.name)
          : mod.defaultExport;
      }

      const page = await convertingPage?.promise;

      if (!page) {
        throw new Error(
          `Cannot find the component "${reference.name}" used in the route "${path}".`
        );
      }
      if (page.type !== "page") {
        throw new Error(
          `The component "${reference.name}" used in the route "${path}" must be a page component.`
        );
      }

      // When there are no sub-routes,
      // we can treat it as an exact match route.
      const hasSub = hasSubRoutes(page.bricks);

      return {
        path: `\${APP.homepage}${path === "/" ? "" : path}`,
        alias: componentName,
        exact: !hasSub,
        incrementalSubRoutes: hasSub,
        bricks: page.bricks,
        context: page.context,
        ...(menu ? { menu } : null),
      };
    }) ?? []
  );

  // The more specific routes should come first (ranked routing like React Router)
  routes.sort((a, b) => {
    const scoreA = computeRouteScore(a.path);
    const scoreB = computeRouteScore(b.path);
    return scoreB - scoreA;
  });

  // If parent Routes has menu, wrap routes in a parent route with type: "routes"
  if (parentMenu) {
    return [
      {
        type: "routes" as const,
        path: "${APP.homepage}",
        routes,
        menu: parentMenu,
      },
    ];
  }

  return routes;
}

// Scoring constants (similar to React Router)
const staticSegmentValue = 10;
const dynamicSegmentValue = 3;
const splatPenalty = -2;

// Matches dynamic path segments like :id, :userId, etc.
const paramRe = /^:[\w-]+$/;
const isSplat = (s: string) => s === "*";

/**
 * Compute a score for a route path to determine matching priority.
 * Higher scores indicate more specific routes.
 *
 * Scoring rules (similar to React Router):
 * - Static segments (e.g., "users") score 10 points each
 * - Dynamic segments (e.g., ":id") score 3 points each
 * - Splat/wildcard ("*") subtracts 2 points
 *
 * This ensures that more specific routes are matched first:
 * - "/users/profile" (score: 22) > "/users/:id" (score: 15)
 * - "/users/:id/edit" (score: 26) > "/users/:id" (score: 15)
 */
export function computeRouteScore(path: string): number {
  // Remove the ${APP.homepage} prefix to get the actual path segments
  const actualPath = path.replace(/^\$\{APP\.homepage\}/, "");
  const segments = actualPath.split("/").filter(Boolean);

  let initialScore = segments.length;

  if (segments.some(isSplat)) {
    initialScore += splatPenalty;
  }

  return segments
    .filter((s) => !isSplat(s))
    .reduce(
      (score, segment) =>
        score +
        (paramRe.test(segment) ? dynamicSegmentValue : staticSegmentValue),
      initialScore
    );
}

function hasSubRoutes(bricks: BrickConf[]): boolean {
  return bricks.some((brick) => {
    return brick.slots
      ? Object.values(brick.slots).some((slot) => {
          return (
            slot.type === "routes" || (slot.bricks && hasSubRoutes(slot.bricks))
          );
        })
      : brick.children
        ? hasSubRoutes(brick.children as BrickConf[])
        : false;
  });
}
