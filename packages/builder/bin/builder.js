#!/usr/bin/env node
import {
  readdir,
  readFile,
  writeFile,
  watch,
  rm,
  mkdir,
  cp,
} from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import jsYaml from "js-yaml";
import chalk from "chalk";
import _ from "lodash";
import {
  CSS_EXTENSIONS,
  IMAGE_EXTENSIONS,
  SCRIPT_EXTENSIONS,
} from "@next-tsx/parser";
import { init as initRaw } from "../src/raw-loader/index.js";
import { transformCssFiles } from "../src/transformCssFiles.js";
import hash from "../src/hash.js";
import { transformFunction } from "../src/transformFunction.js";
import { logErrors } from "../src/logErrors.js";

initRaw();

const { safeDump, JSON_SCHEMA } = jsYaml;
const { difference, isEmpty, isObject, pick } = _;

const TEXT_EXTENSIONS = [...SCRIPT_EXTENSIONS, ...CSS_EXTENSIONS];
const ALLOWED_EXTENSIONS = [...TEXT_EXTENSIONS, ...IMAGE_EXTENSIONS];
const EXCLUDED_EXTENSIONS = [
  ".d.ts",
  ".spec.ts",
  ".spec.tsx",
  ".spec.js",
  ".spec.jsx",
];

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");
const imagesDir = path.join(distDir, "images");

// 任务队列状态管理
let isTaskRunning = false;
let hasPendingTask = false;

async function buildApp(watchMode, withContracts) {
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

  /** @type {Map<string, string>} */
  const imageMap = new Map();

  const processDirectory = async (dirPath) => {
    const list = await readdir(dirPath, { withFileTypes: true });
    for (const item of list) {
      if (item.isDirectory()) {
        await processDirectory(path.join(dirPath, item.name));
      } else if (item.isFile()) {
        const isText = TEXT_EXTENSIONS.some((ext) => item.name.endsWith(ext));
        const isImage =
          !isText && IMAGE_EXTENSIONS.some((ext) => item.name.endsWith(ext));
        if (
          (isText || isImage) &&
          !EXCLUDED_EXTENSIONS.some((ext) => item.name.endsWith(ext))
        ) {
          const filePath = path.join(dirPath, item.name);
          const relativeFilePath = `/${path.relative(srcDir, filePath)}`;
          let content = "";
          let assetName;
          if (isText) {
            content = await readFile(filePath, "utf-8");
          } else {
            const buf = await readFile(filePath);
            const basename = path.basename(filePath);
            const extname = path.extname(basename);
            const contentHash = hash("sha1", buf, 16);
            assetName = `${contentHash}${extname}`;
            imageMap.set(relativeFilePath, assetName);
          }
          files.push({
            filePath: relativeFilePath,
            content,
            assetName,
          });
        }
      }
    }
  };

  await processDirectory(srcDir);

  // Clean dist directory
  if (existsSync(distDir)) {
    await rm(distDir, { recursive: true, force: true });
  }

  const app = parseApp(files);

  if (app.errors.length > 0) {
    console.error(chalk.red("Errors found during parsing the app:"));
    logErrors(app.errors, watchMode);
  }

  // Copy images
  await mkdir(imagesDir, { recursive: true });
  for (const imageFile of app.imageFiles) {
    const assetName = imageMap.get(imageFile);
    if (assetName) {
      await cp(
        path.join(srcDir, imageFile.slice(1)),
        path.join(imagesDir, assetName)
      );
    }
  }

  let contracts;

  if (app.contracts.size > 0) {
    const contractsJsonPath = path.join(rootDir, "contracts.json");

    if (withContracts) {
      const res = await fetch(process.env.CONTRACT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: process.env.CONTRACT_COOKIE,
        },
        body: JSON.stringify({
          contract: [...app.contracts].map((name) => ({
            fullContractName: name,
            version: "*",
          })),
        }),
      });
      if (!res.ok) {
        let errorData;
        try {
          errorData = await res.text();
          throw new Error(
            `Failed to fetch contracts: ${res.status} ${res.statusText}:\n${errorData}`
          );
        } catch (e) {
          if (errorData) {
            throw e;
          }
        }
        throw new Error(
          `Failed to fetch contracts: ${res.status} ${res.statusText}`
        );
      }
      const {
        data: { list },
      } = await res.json();

      contracts = buildContracts(list);
      await writeFile(
        contractsJsonPath,
        JSON.stringify(contracts, null, 2),
        "utf-8"
      );
    } else {
      if (existsSync(contractsJsonPath)) {
        const contractsContent = await readFile(contractsJsonPath, "utf-8");
        contracts = JSON.parse(contractsContent);
      } else {
        logErrors(
          [
            {
              severity: "warning",
              message: `contracts.json not found but contracts are used in the app.`,
              filePath: "/contracts.json",
            },
          ],
          watchMode
        );
      }
    }
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

  console.log(
    `Using global theme variant: ${appJson?.defaultConfig?.settings?.misc?.globalThemeVariant}`
  );

  const { routes, functions, templates, menus, errors } = await convertApp(
    app,
    {
      rootId: "",
      themeVariant: appJson?.defaultConfig?.settings?.misc?.globalThemeVariant,
      i18n,
    }
  );

  const transformedFunctions = await Promise.all(
    functions.map((fn) => transformFunction(fn, app.files, watchMode))
  );

  if (errors.length > 0) {
    console.error(chalk.red("Errors found during converting the app:"));
    logErrors(errors, watchMode);
  }

  const transformedCssFiles = await transformCssFiles(app.cssFiles, watchMode);

  const targetPath = path.join(rootDir, "storyboard.yaml");
  await writeFile(
    targetPath,
    safeDump(
      {
        app: {
          uiVersion: "8.2",
          ...appJson,
          standaloneMode: true,
          noPlaceholders: true,
          constants: transformedCssFiles,
        },
        routes,
        meta: {
          functions: transformedFunctions,
          customTemplates: templates,
          i18n,
          contracts,
          menus,
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
async function executeTask(watchMode, withContracts) {
  if (isTaskRunning) {
    hasPendingTask = true;
    return;
  }

  isTaskRunning = true;
  hasPendingTask = false;

  try {
    await buildApp(watchMode, withContracts);
  } catch (error) {
    console.error(chalk.red("Build failed:", error));
  } finally {
    isTaskRunning = false;

    // 检查是否有待处理的任务
    if (hasPendingTask) {
      // 使用 setImmediate 确保异步执行
      setImmediate(() => executeTask(watchMode, withContracts));
    }
  }
}

// 文件监听和主函数
async function main() {
  const args = process.argv.slice(2);
  const watchMode = args.includes("--watch") || args.includes("-w");
  const withContracts = args.includes("--with-contracts");

  if (withContracts) {
    if (!process.env.CONTRACT_COOKIE || !process.env.CONTRACT_URL) {
      console.error(
        chalk.red(
          "CONTRACT_COOKIE and CONTRACT_URL environment variables are required when using --with-contracts"
        )
      );
      process.exit(1);
    }
  }

  // 首次执行构建
  await executeTask(watchMode, withContracts);

  if (watchMode) {
    console.log("Watching for file changes...");

    try {
      const watcher = watch(srcDir, { recursive: true });

      for await (const event of watcher) {
        const { filename } = event;
        // 只处理我们关心的文件类型
        if (
          filename &&
          (ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext)) ||
            filename.endsWith(".json")) &&
          !EXCLUDED_EXTENSIONS.some((ext) => filename.endsWith(ext))
        ) {
          console.log(`File changed: ${filename}`);
          await executeTask(watchMode, withContracts);
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
 * Remove unnecessary fields from contract to stored in storyboard.
 */
function buildContracts(contract) {
  return contract?.map(({ request, response, ...item }) => {
    const isSimpleRequest = ["list", "get", "delete", "head"].includes(
      item.endpoint?.method?.toLowerCase()
    );
    return {
      ...item,
      request: {
        type: request?.type,
        fields: isSimpleRequest
          ? request.fields
              ?.map((field) => pick(field, ["ref", "type"]))
              // For simple requests, keep just one more field than ones in the uri params.
              // It is used for detecting whether there is query params.
              .slice(
                0,
                (item.endpoint.uri?.match(/:([^/]+)/g)?.length ?? 0) + 1
              )
          : hasFileType(request)
            ? [
                {
                  // One field with type file is enough for detecting file upload.
                  type: "file",
                },
              ]
            : undefined,
      },
      response: {
        type: response?.type,
        wrapper: response?.wrapper,
      },
    };
  });
}

function hasFileType(request) {
  if (request?.type !== "object") {
    return false;
  }

  const processFields = (fields) => {
    return (
      !isEmpty(fields) &&
      fields.some(
        (field) =>
          ["file", "file[]"].includes(field.type) || processFields(field.fields)
      )
    );
  };

  return processFields(request.fields);
}
