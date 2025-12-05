# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Next TSX 是一个将 TSX 项目转换为 `storyboard.yaml` 的工具链。项目使用 Lerna + Yarn Workspaces 管理 monorepo。

### 核心包

- **@next-tsx/parser**: 解析 TSX 项目,通过分析和遍历 AST 构造静态的结构化声明
  - 主要入口: `parseView()`, `parseApp()`
  - 使用 `@babel/parser` 和 `@babel/traverse` 进行 AST 分析
  - 导出 `interfaces.ts` 中定义的结构化类型

- **@next-tsx/converter**: 将 parser 解析的结构化声明转换为 storyboard 定义
  - 主要入口: `convertView()`, `convertApp()`
  - 依赖 `@next-tsx/parser` 的输出
  - 包含大量特定组件的转换器 (convertButton, convertForm, convertTable 等)

- **@next-tsx/builder**: CLI 工具,负责将 TSX 项目构建为 `storyboard.yaml`
  - 可执行文件: `bin/builder.js`
  - 整合 parser 和 converter 完成完整的构建流程
  - 处理 CSS 文件转换和函数转换

- **@next-tsx/core**: 基础框架服务的 TypeScript 类型定义

### 应用结构

apps/ 目录下的应用遵循以下结构:

```
apps/YOUR-APP-ID/src/
├── Components/   # 组件(tpl-*)
├── Contexts/     # 跨组件共享上下文
├── Pages/        # 页面(路由)
├── Utils/        # 辅助函数
├── app.json      # 应用基本信息
├── i18n.json     # 国际化配置
└── index.tsx     # 入口文件,定义第一层路由页面
```

## 常用命令

### 安装依赖

```bash
yarn
```

### 开发模式

启动特定包的开发模式(watch 模式):

```bash
# 启动 parser 包的开发
yarn start --scope @next-tsx/parser

# 启动 converter 包的开发
yarn start --scope @next-tsx/converter

# 启动测试应用
yarn start --scope @apps/test
```

或在所有包中启动开发模式:

```bash
yarn start
```

### 构建

构建所有包(使用 lerna 并发构建,最多 2 个并发):

```bash
yarn build
```

单独构建某个包:

```bash
cd packages/parser
yarn build
```

### 测试

运行所有测试:

```bash
yarn test
```

CI 模式运行测试(并发 2,使用 runInBand):

```bash
yarn test:ci
```

单独测试某个包:

```bash
cd packages/parser
yarn test
```

### 代码格式化

项目使用 Prettier 和 lint-staged。提交前会自动格式化:

```bash
yarn lint-staged
```

### 本地服务

使用 brick-container 启动本地服务:

```bash
yarn serve
```

## 架构要点

### Parser 流程

1. 使用 `@babel/parser` 解析 TSX 文件为 AST
2. 通过 `@babel/traverse` 遍历 AST 节点
3. 识别特定模式(组件、上下文、事件、生命周期等)
4. 构造结构化的声明对象(ParsedView, ParsedApp 等)

关键模块:

- `parseFile.ts`: 解析单个文件
- `parseJSXElement.ts`: 解析 JSX 元素
- `parseModule.ts`: 解析模块级别的声明
- `parseView.ts`, `parseApp.ts`: 顶层解析入口

### Converter 流程

1. 接收 parser 的结构化输出
2. 根据组件类型调用相应的转换器
3. 处理数据源、事件、生命周期等
4. 生成符合 storyboard 规范的 YAML 结构

关键模块:

- `convertView.ts`, `convertApp.ts`: 顶层转换入口
- `convertComponent.ts`: 组件转换的通用逻辑
- `convertRoutes.ts`: 路由转换
- 各种 `convert*.ts`: 特定组件的转换器

### Builder 流程

1. 读取 TSX 项目源文件
2. 调用 parser 解析项目
3. 调用 converter 转换为 storyboard
4. 处理 CSS 文件和函数转换
5. 输出最终的 `storyboard.yaml`

## 技术栈

- **语言**: TypeScript (ES modules)
- **构建工具**:
  - `@next-core/build-next-libs` 用于构建库
  - `esbuild` 用于快速构建
  - `concurrently` 同时运行 types 和 main 构建
- **测试**: Jest + `@next-core/test-next`
- **Monorepo**: Lerna 8.x + Yarn Workspaces
- **Node 版本**: ^20.8.0 || >=22 (builder 包要求)

## 开发注意事项

### 模块系统

所有包都使用 ESM (`"type": "module"`),导出 CJS 和 ESM 两种格式:

- ESM: `dist/esm/index.js`
- CJS: `dist/cjs/index.js`
- Types: `dist/types/index.d.ts`

### 启动开发模式

每个包的 `start` 脚本会:

1. 清理 `dist` 目录
2. 并发运行两个任务:
   - `start:types`: watch 模式生成类型定义
   - `start:main`: watch 模式构建主代码(ESM + CJS)

### 路由处理

路由系统有特殊的排序和匹配逻辑(参考 git log):

- 路由按照类似 React Router 的方式排序
- 使用路由评分机制
- 根据是否有子路由设置 `exact` 属性

### 包依赖关系

```
@next-tsx/builder
    ├── @next-tsx/converter
    │       └── @next-tsx/parser
    └── @next-tsx/parser
```

修改 parser 后,需要重新构建 converter 和 builder。
