// @ts-check
import { parse } from "@babel/parser";
import { collectMemberUsageInFunction } from "@next-core/utils/storyboard";
import { precookFunction } from "@next-core/cook";
import { build } from "esbuild";
import { logErrors } from "./logErrors.js";

/**
 * Transform a normal storyboard function to a transformed one,
 * so that it can be executed in "native mode".
 *
 * @param {import("@next-core/types").StoryboardFunction} fn
 * @param {boolean} watchMode
 * @returns {Promise<import("@next-core/types").StoryboardFunction>}
 */
export async function transformFunction(fn, watchMode) {
  const sourcefile = `${fn.name}.${fn.typescript ? "ts" : "js"}`;

  try {
    const result = await build({
      stdin: {
        contents: fn.source,
        sourcefile,
        loader: sourcefile.endsWith(".ts") ? "ts" : "js",
      },
      write: false,
      charset: "utf8",
      target: "es2018",
      sourcemap: false,
      minify: !watchMode,
      tsconfigRaw: JSON.stringify({
        compilerOptions: {
          target: "es2018",
          module: "esnext",
        },
      }),
    });

    if (result.outputFiles.length !== 1) {
      logErrors(
        [
          {
            message: `Transforming function ${fn.name} failed: expected exactly one output file, but got ${result.outputFiles.length}`,
            severity: "warning",
            node: null,
          },
        ],
        watchMode
      );
      return fn;
    }

    const newSource = result.outputFiles[0].text;

    const ast = parse(newSource, {
      sourceType: "script",
    });

    const body = ast.program.body;

    if (body.length !== 1) {
      logErrors(
        [
          {
            message: `Transforming function ${fn.name} failed: expected exactly one statement in the output, but got ${body.length}`,
            severity: "warning",
            node: null,
          },
        ],
        watchMode
      );
      return fn;
    }

    const stmt = body[0];
    if (stmt.type !== "FunctionDeclaration") {
      logErrors(
        [
          {
            message: `Transforming function ${fn.name} failed: expected a function declaration, but got ${stmt.type}`,
            severity: "warning",
            node: null,
          },
        ],
        watchMode
      );
      return fn;
    }

    const deps = collectMemberUsageInFunction(fn, "FN");
    // Remove self
    deps.delete(fn.name);
    const perm = collectMemberUsageInFunction(fn, "PERMISSIONS", true).has(
      "check"
    );

    const { attemptToVisitGlobals } = precookFunction(fn.source, {
      cacheKey: fn,
      typescript: fn.typescript,
    });
    attemptToVisitGlobals.delete("undefined");

    return {
      name: fn.name,
      source: "",
      deps: [...deps],
      perm,
      transformed: {
        source: newSource,
        globals: [...attemptToVisitGlobals],
      },
    };
  } catch (error) {
    logErrors(
      [
        {
          message: `Transforming function ${fn.name} failed: ${String(error)}`,
          severity: "warning",
          node: null,
        },
      ],
      watchMode
    );
    return fn;
  }
}
