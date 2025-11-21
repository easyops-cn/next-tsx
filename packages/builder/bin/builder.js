#!/usr/bin/env node
import { readdir, readFile, writeFile, watch } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import jsYaml from "js-yaml";
import chalk from "chalk";
import _ from "lodash";
import { init as initRaw } from "../src/raw-loader/index.js";

initRaw();

const { safeDump, JSON_SCHEMA } = jsYaml;
const { difference, isObject } = _;

const ALLOWED_EXTENSIONS = [".ts", ".tsx", ".css", ".json"];
const EXCLUDED_EXTENSIONS = [".d.ts", ".spec.ts", ".spec.tsx"];

const srcDir = path.join(process.cwd(), "src");

// 任务队列状态管理
let isTaskRunning = false;
let hasPendingTask = false;

async function buildApp(watchMode) {
  const start = performance.now();
  console.log("Start building...");
  const { parseApp } = await import("@next-tsx/parser");
  const { convertApp } = await import("@next-tsx/converter");

  const appJsonPath = path.join(srcDir, "app.json");
  if (!existsSync(appJsonPath)) {
    throw new Error(`app.json not found in ${srcDir}`);
  }
  const appJsonContent = await readFile(appJsonPath, "utf-8");
  const appJson = JSON.parse(appJsonContent);

  /** @type {import("@next-tsx/parser").SourceFile[]} */
  const files = [];

  const processDirectory = async (dirPath) => {
    const list = await readdir(dirPath, { withFileTypes: true });
    for (const item of list) {
      if (item.isDirectory()) {
        await processDirectory(path.join(dirPath, item.name));
      } else if (item.isFile()) {
        if (
          ALLOWED_EXTENSIONS.some((ext) => item.name.endsWith(ext)) &&
          !EXCLUDED_EXTENSIONS.some((ext) => item.name.endsWith(ext))
        ) {
          const filePath = path.join(dirPath, item.name);
          const content = await readFile(filePath, "utf-8");
          files.push({
            filePath: `/${path.relative(srcDir, filePath)}`,
            content,
          });
        }
      }
    }
  };

  await processDirectory(srcDir);

  const app = parseApp(files);

  if (app.errors.length > 0) {
    console.error(chalk.red("Errors found during parsing the app:"));
    logErrors(app.errors, watchMode);
  }

  const i18nJsonPath = path.join(srcDir, "i18n.json");
  /** @type {import("@next-core/types").MetaI18n | undefined} */
  let i18n;
  if (existsSync(i18nJsonPath)) {
    const i18nContent = await readFile(i18nJsonPath, "utf-8");
    i18n = JSON.parse(i18nContent);
  }

  if (app.i18nKeys.size > 0) {
    if (!i18n) {
      logErrors(
        [
          {
            severity: "warning",
            message: `i18n.json not found but translate() are used in the app.`,
            filePath: "/i18n.json",
          },
        ],
        watchMode
      );
    } else if (!isObject(i18n)) {
      logErrors(
        [
          {
            severity: "error",
            message: `i18n.json is not a valid object.`,
            filePath: "/i18n.json",
          },
        ],
        watchMode
      );
    } else if (Object.keys(i18n).length === 0) {
      logErrors(
        [
          {
            severity: "warning",
            message: `i18n.json does not contain any locale but translate() are used in the app.`,
            filePath: "/i18n.json",
          },
        ],
        watchMode
      );
    } else {
      for (const [key, translations] of Object.entries(i18n)) {
        if (!isObject(translations)) {
          logErrors(
            [
              {
                severity: "error",
                message: `Translations for locale "${key}" is not a valid object.`,
                filePath: "/i18n.json",
              },
            ],
            watchMode
          );
          continue;
        }
        const translatedKeys = Object.keys(translations);

        const missingKeys = difference(
          Array.from(app.i18nKeys),
          translatedKeys
        );
        if (missingKeys.length > 0) {
          const plural = missingKeys.length > 1 ? "s" : "";
          const hasRest = missingKeys.length > 3;
          logErrors(
            [
              {
                severity: "warning",
                message: `Missing translations for ${missingKeys.length} key${plural} in locale "${key}": ${
                  hasRest
                    ? `${missingKeys.slice(0, 3).join(", ")}, ...`
                    : missingKeys.join(", ")
                }`,
                filePath: "/i18n.json",
              },
            ],
            watchMode
          );
        }
      }
    }
  }

  const { routes, functions, templates, constants, errors } = await convertApp(
    app,
    {
      rootId: "",
    }
  );

  if (errors.length > 0) {
    console.error(chalk.red("Errors found during converting the app:"));
    logErrors(errors, watchMode);
  }

  const targetPath = path.join(process.cwd(), "storyboard.yaml");
  await writeFile(
    targetPath,
    safeDump(
      {
        app: {
          uiVersion: "8.2",
          ...appJson,
          standaloneMode: true,
          noPlaceholders: true,
          constants,
        },
        routes,
        meta: {
          functions,
          customTemplates: templates,
          i18n,
        },
      },
      {
        indent: 2,
        schema: JSON_SCHEMA,
        skipInvalid: true,
        noRefs: true,
        noCompatMode: true,
      }
    ),
    "utf-8"
  );
  console.log(
    chalk.green(`Done in ${Math.ceil(performance.now() - start)} ms`)
  );
}

// 任务队列管理函数
async function executeTask(watchMode) {
  if (isTaskRunning) {
    hasPendingTask = true;
    return;
  }

  isTaskRunning = true;
  hasPendingTask = false;

  try {
    await buildApp(watchMode);
  } catch (error) {
    console.error(chalk.red("Build failed:", error));
  } finally {
    isTaskRunning = false;

    // 检查是否有待处理的任务
    if (hasPendingTask) {
      // 使用 setImmediate 确保异步执行
      setImmediate(() => executeTask(watchMode));
    }
  }
}

// 文件监听和主函数
async function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes("--watch") || args.includes("-w");

  // 首次执行构建
  await executeTask(watchMode);

  if (watchMode) {
    console.log("Watching for file changes...");

    try {
      const watcher = watch(srcDir, { recursive: true });

      for await (const event of watcher) {
        const { filename } = event;
        // 只处理我们关心的文件类型
        if (
          filename &&
          ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext)) &&
          !EXCLUDED_EXTENSIONS.some((ext) => filename.endsWith(ext))
        ) {
          console.log(`File changed: ${filename}`);
          await executeTask(watchMode);
        }
      }
    } catch (error) {
      console.error(chalk.red("Watching failed:", error));
    }
  }
}

main().catch((error) => {
  console.error(chalk.red("Unexpected error:", error));
});

/**
 *
 * @param {import("@next-tsx/parser").ParseError[]} errors
 * @param {boolean} watchMode
 */
function logErrors(errors, watchMode) {
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
