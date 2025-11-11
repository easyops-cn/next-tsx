import { isRenderUseBrick, type ParsedModule } from "@next-tsx/parser";
import { isObject } from "@next-core/utils/general";
import type { BrickConf } from "@next-core/types";
import type { ConvertOptions, ConvertState } from "./interfaces.js";
import { convertComponent } from "./convertComponent.js";
import { deepReplaceVariables } from "./deepReplaceVariables.js";

export async function convertProperties(
  properties: Record<string, unknown>,
  mod: ParsedModule,
  state: ConvertState,
  options: ConvertOptions,
  scope: "page" | "view" | "template"
) {
  const convertPropValue = async (value: unknown): Promise<unknown> => {
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => convertPropValue(item)));
    }

    if (isObject(value)) {
      return Object.fromEntries(
        await Promise.all(
          Object.entries(value).map(async ([k, v]) => {
            if (k === "render" && isObject(v) && isRenderUseBrick(v)) {
              const patterns = new Map<string, string>();
              if (v.params.length > 0) {
                patterns.set(v.params[0], "DATA");
              }
              const useBrick = (
                await Promise.all(
                  v.children.map(
                    (child) =>
                      convertComponent(
                        child,
                        mod,
                        state,
                        options,
                        scope
                      ) as Promise<BrickConf | BrickConf[]>
                  )
                )
              ).flatMap((child) => deepReplaceVariables(child, patterns));
              return ["useBrick", useBrick];
            }
            return [k, await convertPropValue(v)];
          })
        )
      );
    }

    return value;
  };

  const props = (await convertPropValue(properties)) as Record<string, unknown>;

  return props;
}
