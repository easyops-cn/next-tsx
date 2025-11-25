# Next TSX

- `@next-tsx/builder`: 负责将 TSX 项目解析并转换为 `storyboard.yaml`。
- `@next-tsx/core`: 提供了基础框架服务（仅包含 TypeScript 类型定义）。
- `@next-tsx/parser`: 负责解析 TSX 项目，通过分析和遍历 AST 并构造成静态的结构化声明。
- `@next-tsx/converter`: 负责将 parser 解析得到的静态结构化声明转换为 storyboard 定义。

## 开发

```bash
yarn

yarn start --scope @next-tsx/parser

yarn start --scope @next-tsx/converter

yarn start --scope @apps/test
```
