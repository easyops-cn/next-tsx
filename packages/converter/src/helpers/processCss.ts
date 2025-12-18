export function processCss(css: string): string {
  // 替换 CSS 中的图片占位符为动态 URL
  // 将 __IMG__assetName__ 替换为 IMG.get(assetName) 的结果
  return css.replace(/__IMG__(.+?)__/g, (_match, assetName) => {
    // @ts-expect-error IMG is available at runtime
    return IMG.get(assetName);
  });
}
