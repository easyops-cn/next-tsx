import path from "node:path";
import chalk from "chalk";

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");

/**
 *
 * @param {import("@next-tsx/parser").ParseError[]} errors
 * @param {boolean} watchMode
 */
export function logErrors(errors, watchMode) {
  let shouldBailout = false;
  for (const err of errors) {
    const color =
      err.severity === "notice" || err.severity === "warning"
        ? "yellow"
        : "red";
    console.error(chalk[color](`[${err.severity}] ${err.message}`));
    console.error(
      chalk[color](
        `  at ${srcDir}${err.filePath}${err.node ? `:${err.node.loc.start.line}:${err.node.loc.start.column}` : ""}`
      )
    );
    if (
      !shouldBailout &&
      (err.severity === "error" || err.severity === "fatal")
    ) {
      shouldBailout = true;
    }
  }
  if (shouldBailout && !watchMode) {
    process.exit(1);
  }
}
