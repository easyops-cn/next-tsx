// @ts-check
import postcss from "postcss";
import postcssPresetEnv from "postcss-preset-env";
import cssnano from "cssnano";
import cssnanoPresetLite from "cssnano-preset-lite";

/**
 * @param {Map<string, string>} cssFiles
 * @param {import("@next-tsx/parser").ParseError[]} errors
 * @return {Promise<Record<string, string>>}
 */
export async function transformCssFiles(cssFiles, errors) {
  return Object.fromEntries(
    await Promise.all(
      [...cssFiles].map(async ([filename, content]) => {
        try {
          const transformedContent = await transformCss(content, filename);
          return [filename, transformedContent];
        } catch (error) {
          errors.push({
            message: `Transforming CSS file ${filename} failed: ${String(error)}`,
            filePath: filename,
            severity: "error",
            node: null,
          });
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
 * @returns {Promise<string>}
 */
async function transformCss(content, filename) {
  const output = await postcss([
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
