// @ts-check
import path from "node:path";
import postcss from "postcss";
import postcssUrl from "postcss-url";
import postcssPresetEnv from "postcss-preset-env";
import cssnano from "cssnano";
import cssnanoPresetLite from "cssnano-preset-lite";
import { logErrors } from "./logErrors.js";

/**
 * Transform CSS files using PostCSS with preset-env and cssnano.
 *
 * @param {Map<string, string>} cssFiles
 * @param {boolean} watchMode
 * @param {Map<string, string>} imageMap - 图片路径到 hash 文件名的映射
 * @param {string} srcDir - 源代码目录
 * @return {Promise<Record<string, string>>}
 */
export async function transformCssFiles(cssFiles, watchMode, imageMap, srcDir) {
  return Object.fromEntries(
    await Promise.all(
      [...cssFiles].map(async ([filename, content]) => {
        try {
          const transformedContent = await transformCss(
            content,
            filename,
            imageMap,
            srcDir
          );
          return [filename, transformedContent];
        } catch (error) {
          logErrors(
            [
              {
                message: `Transforming CSS file ${filename} failed: ${String(error)}`,
                filePath: filename,
                severity: "error",
                node: null,
              },
            ],
            watchMode
          );
          // 返回原始内容以避免丢失文件
          return [filename, content];
        }
      })
    )
  );
}

/**
 * @param {string} content
 * @param {string} filename
 * @param {Map<string, string>} imageMap
 * @param {string} srcDir
 * @returns {Promise<string>}
 */
async function transformCss(content, filename, imageMap, srcDir) {
  const output = await postcss([
    postcssUrl({
      url: (asset) => {
        if (
          asset.url.startsWith("http://") ||
          asset.url.startsWith("https://") ||
          asset.url.startsWith("data:") ||
          asset.url.startsWith("//")
        ) {
          return asset.url;
        }

        try {
          const cssDir = path.dirname(filename);
          const resolvedPath = path.resolve(srcDir, cssDir.slice(1), asset.url);
          const relativePath = "/" + path.relative(srcDir, resolvedPath);

          const assetName = imageMap.get(relativePath);
          if (assetName) {
            // 使用特殊占位符，将在运行时被 _helper_processCss 替换
            return `__IMG__${assetName}__`;
          }
        } catch (error) {
          console.warn(
            `Failed to resolve image URL "${asset.url}" in ${filename}:`,
            error
          );
        }

        return asset.url;
      },
    }),
    postcssPresetEnv(),
    cssnano({
      preset: cssnanoPresetLite({
        discardComments: {
          removeAll: true,
        },
      }),
    }),
  ]).process(content, { from: filename });
  return output.css;
}
