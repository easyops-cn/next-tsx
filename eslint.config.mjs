import eslintConfigNext from "@next-core/eslint-config-next";
import nodeConfig from "@next-core/eslint-config-next/node.js";
import globals from "globals";

export default [
  {
    ignores: ["**/node_modules", "**/dist"],
  },
  ...eslintConfigNext,
  {
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": "off",
    },
  },
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
