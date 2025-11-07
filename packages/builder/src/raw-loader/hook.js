import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export function createHook(options) {
  let settings = {
    extensions: [".css"],
    ...options,
  };
  const initialize = (opts) => {
    settings = {
      ...settings,
      ...opts,
    };
  };

  const load = async (url, context, nextLoad) => {
    const queryIndex = url.indexOf("?");
    if (queryIndex === -1) {
      return nextLoad(url);
    }

    const params = new URLSearchParams(url.slice(queryIndex + 1));
    if (!params.has("raw")) {
      return nextLoad(url);
    }

    const filePath = fileURLToPath(url.slice(0, queryIndex));
    const content = await readFile(filePath, "utf8");

    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${JSON.stringify(content)};`,
    };
  };

  return { initialize, load };
}

const { initialize, load } = createHook();

export { initialize, load };
