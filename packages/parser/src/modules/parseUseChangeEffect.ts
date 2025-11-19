import type { NodePath } from "@babel/traverse";
import type * as t from "@babel/types";
import type {
  ComponentChild,
  ParsedApp,
  ParsedModule,
  ParseJsValueOptions,
} from "./interfaces.js";
import {
  isGeneralFunctionExpression,
  validateFunction,
} from "./validations.js";
import { parseEventHandlers } from "./parseEvent.js";
import { CTX_BINDING_KINDS } from "./constants.js";
import { getUniqueId } from "./getUniqueId.js";

export function parseUseChangeEffect(
  expr: NodePath<t.CallExpression>,
  state: ParsedModule,
  app: ParsedApp,
  options: ParseJsValueOptions
): {
  component: ComponentChild;
  deps: t.Identifier[];
  id: string;
} | null {
  const args = expr.get("arguments");
  if (args.length !== 2) {
    state.errors.push({
      message: `useEffect() requires exactly 2 arguments, received ${args.length}`,
      node: expr.node,
      severity: "error",
    });
    return null;
  }
  const callback = args[0];
  const depArray = args[1];
  if (!isGeneralFunctionExpression(callback)) {
    state.errors.push({
      message: `useEffect() first argument must be a function, received ${callback.type}`,
      node: callback.node,
      severity: "error",
    });
    return null;
  }
  if (!validateFunction(callback.node, state)) {
    return null;
  }
  const callbackParams = callback.get("params");
  if (callbackParams.length > 0) {
    state.errors.push({
      message: `useEffect() function must not have parameters, received ${callbackParams.length}`,
      node: callbackParams[0].node,
      severity: "error",
    });
    return null;
  }

  const callbackBody = callback.get("body");
  if (!callbackBody.isBlockStatement()) {
    state.errors.push({
      message: `useEffect() function body must be a block statement, received ${callbackBody.type}`,
      node: callbackBody.node,
      severity: "error",
    });
    return null;
  }
  if (!depArray.isArrayExpression()) {
    state.errors.push({
      message: `useEffect() second argument must be an array, received ${depArray.type}`,
      node: depArray.node,
      severity: "error",
    });
    return null;
  }
  const depElements = depArray.get("elements");
  if (depElements.length === 0) {
    state.errors.push({
      message: `useEffect() dependency array must have at least one element`,
      node: depArray.node,
      severity: "error",
    });
    return null;
  }

  // context/state onChange
  const deps: t.Identifier[] = [];
  for (const depElement of depElements) {
    if (!depElement.isIdentifier()) {
      state.errors.push({
        message: `useEffect() dependency array elements must be identifiers, received ${depElement.type}`,
        node: depElement.node,
        severity: "error",
      });
      break;
    }
    const bindingId = depElement.scope.getBindingIdentifier(
      depElement.node.name
    );
    const depBinding = bindingId
      ? options.component?.bindingMap.get(bindingId)
      : undefined;
    if (!depBinding || !CTX_BINDING_KINDS.includes(depBinding.kind)) {
      state.errors.push({
        message: `useEffect() dependency "${depElement.node.name}" is invalid or not defined`,
        node: depElement.node,
        severity: "error",
      });
      break;
    }
    deps.push(depBinding.id);
  }

  if (deps.length !== depElements.length) {
    return null;
  }

  const handlers = parseEventHandlers(callbackBody, state, app, options);

  if (handlers && (!Array.isArray(handlers) || handlers.length > 0)) {
    const id = getUniqueId("effect-batch-agent-");
    const component: ComponentChild = {
      name: "eo-batch-agent",
      portal: true,
      properties: {},
      events: {
        trigger: handlers,
      },
    };

    if (options.component!.type === "template") {
      component.ref = id;
    } else {
      component.properties.id = id;
    }

    return { component, deps, id };
  }

  return null;
}
