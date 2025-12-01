import type { NodePath } from "@babel/traverse";
import type * as t from "@babel/types";
import type {
  DataSource,
  ParsedApp,
  ParsedModule,
  ParseJsValueOptions,
} from "./interfaces.js";
import { parseJsValue } from "./parseJsValue.js";
import { validateFunction } from "./validations.js";
import { parseResourceCall } from "./parseResourceCall.js";
import type { Menu } from "../interfaces.js";

export function parseCreateMenu(
  callee: NodePath<t.Node>,
  args: NodePath<t.Node>[],
  state: ParsedModule,
  app: ParsedApp,
  options: ParseJsValueOptions
): Menu | null {
  if (args.length !== 3) {
    state.errors.push({
      message: `createMenu() expects exactly three arguments, received: ${args.length}`,
      node: args.length > 3 ? args[3].node : callee.node,
      severity: "error",
    });
    return null;
  }
  const menuIdArg = args[0];
  const configArg = args[1];
  const itemsArg = args[2];

  if (!menuIdArg.isStringLiteral()) {
    state.errors.push({
      message: `createMenu() first argument "menuId" must be a string literal.`,
      node: menuIdArg.node,
      severity: "error",
    });
    return null;
  }

  if (!configArg.isObjectExpression()) {
    state.errors.push({
      message: `createMenu() second argument "config" must be an object expression.`,
      node: configArg.node,
      severity: "error",
    });
    return null;
  }

  const collectI18nKeys = new Set<string>();
  const menuOptions = {
    ...options,
    collectI18nKeys,
  };

  const config = parseJsValue(configArg, state, app, menuOptions) as Record<
    string,
    unknown
  >;
  if (!config) {
    return null;
  }

  let items: unknown[] | DataSource | null = null;

  if (itemsArg.isArrayExpression()) {
    // Static menu items
    items = parseJsValue(itemsArg, state, app, menuOptions) as unknown[];
    if (!items) {
      return null;
    }
  } else if (itemsArg.isArrowFunctionExpression()) {
    // Dynamic menu items
    if (!validateFunction(itemsArg.node, state)) {
      return null;
    }
    if (itemsArg.node.params.length > 0) {
      state.errors.push({
        message: `createMenu() third argument "items" arrow function must not have any parameters.`,
        node: itemsArg.node.params[0],
        severity: "error",
      });
      return null;
    }
    const call = itemsArg.get("body");
    if (call.isBlockStatement()) {
      state.errors.push({
        message: `createMenu() third argument "items" callback must not use block statements.`,
        node: call.node,
        severity: "error",
      });
      return null;
    }
    if (!call.isCallExpression()) {
      state.errors.push({
        message: `createMenu() third argument "items" callback must return a call expression.`,
        node: call.node,
        severity: "error",
      });
      return null;
    }
    const callee = call.get("callee");
    if (callee.isMemberExpression()) {
      const property = callee.get("property");
      if (
        !property.isIdentifier() ||
        callee.node.computed ||
        (property.node.name !== "then" && property.node.name !== "catch")
      ) {
        state.errors.push({
          message: `createMenu() third argument "items" callback must return a valid resource call expression (e.g., callProvider(...).then(...) or callApi(...).then(...))`,
          node: property.node,
          severity: "error",
        });
        return null;
      }
      items = parseResourceCall(
        callee.get("object"),
        state,
        app,
        options,
        "",
        undefined,
        call.get("arguments"),
        property.node.name
      );
    } else if (callee.isIdentifier()) {
      items = parseResourceCall(call, state, app, options, "", undefined);
    } else {
      state.errors.push({
        message: `createMenu() third argument "items" callback must return a call expression.`,
        node: callee.node,
        severity: "error",
      });
      return null;
    }
  } else {
    state.errors.push({
      message: `createMenu() third argument "items" must be an array expression or an arrow function expression.`,
      node: itemsArg.node,
      severity: "error",
    });
    return null;
  }

  if (!items) {
    return null;
  }

  return {
    menuId: menuIdArg.node.value,
    config,
    items,
    i18nKeys: collectI18nKeys,
  };
}
