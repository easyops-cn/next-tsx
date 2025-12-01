import type { NodePath } from "@babel/traverse";
import type * as t from "@babel/types";
import type { ParsedModule, BindingInfo } from "./interfaces.js";

export function parseUseMenu(
  decl: NodePath<t.VariableDeclarator>,
  args: NodePath<t.Expression | t.SpreadElement | t.ArgumentPlaceholder>[],
  state: ParsedModule
): BindingInfo | null {
  const declId = decl.get("id");
  if (!declId.isIdentifier()) {
    state.errors.push({
      message: `useMenu() must be assigned to an identifier, received ${declId.type}`,
      node: declId.node,
      severity: "error",
    });
    return null;
  }
  if (args.length !== 1) {
    state.errors.push({
      message: `"useMenu()" must have exactly one argument, but got ${args.length}`,
      node: decl.node,
      severity: "error",
    });
    return null;
  }
  const firstArg = args[0];
  if (!firstArg.isStringLiteral()) {
    state.errors.push({
      message: `"useMenu()" argument must be a string literal, but got ${firstArg.type}`,
      node: firstArg.node,
      severity: "error",
    });
    return null;
  }

  return {
    id: declId.node,
    kind: "menu",
    menuId: firstArg.node.value,
  };
}
