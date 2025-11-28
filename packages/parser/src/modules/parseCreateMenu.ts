import type { NodePath } from "@babel/traverse";
import type * as t from "@babel/types";
import type {
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
  const childrenArg = args[2];

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

  let children: any;

  if (childrenArg.isArrayExpression()) {
    // Static menu items
    children = parseJsValue(childrenArg, state, app, menuOptions);
    if (!children) {
      return null;
    }
  } else if (childrenArg.isArrowFunctionExpression()) {
    // Dynamic menu items
    if (!validateFunction(childrenArg.node, state)) {
      return null;
    }
    if (childrenArg.node.params.length > 0) {
      state.errors.push({
        message: `createMenu() third argument "children" arrow function must not have any parameters.`,
        node: childrenArg.node.params[0],
        severity: "error",
      });
      return null;
    }
    const call = childrenArg.get("body");
    if (call.isBlockStatement()) {
      state.errors.push({
        message: "Block statements are not supported in menu children callback",
        node: call.node,
        severity: "error",
      });
      return null;
    }
    if (!call.isCallExpression()) {
      state.errors.push({
        message: `createMenu() third argument "children" callback must return a call expression.`,
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
          message: `Invalid useResource call`,
          node: property.node,
          severity: "error",
        });
        return null;
      }
      children = parseResourceCall(
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
      children = parseResourceCall(call, state, app, options, "", undefined);
    } else {
      state.errors.push({
        message: `createMenu() third argument "children" callback must return a call expression.`,
        node: callee.node,
        severity: "error",
      });
      return null;
    }
  } else {
    state.errors.push({
      message: `createMenu() third argument "children" must be an array expression or an arrow function expression.`,
      node: childrenArg.node,
      severity: "error",
    });
    return null;
  }

  return {
    menuId: menuIdArg.node.value,
    config,
    children,
    i18nKeys: collectI18nKeys,
  };
}
