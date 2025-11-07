import eslintConfigNext from "@next-core/eslint-config-next";
import nodeConfig from "@next-core/eslint-config-next/node.js";
import globals from "globals";

export default [
  {
    ignores: ["**/node_modules", "**/dist"],
  },
  ...eslintConfigNext,
  {
    files: ["packages/builder/**/*.js"],
    ...nodeConfig,
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
