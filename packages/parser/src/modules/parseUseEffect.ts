import type { NodePath } from "@babel/traverse";
import type * as t from "@babel/types";
import type {
  ComponentChild,
  EventHandler,
  ParsedApp,
  ParsedModule,
  ParseJsValueOptions,
} from "./interfaces.js";
import {
  isGeneralFunctionExpression,
  validateFunction,
} from "./validations.js";
import { parseEventHandlers } from "./parseEvent.js";

export function parseUseEffect(
  expr: NodePath<t.CallExpression>,
  state: ParsedModule,
  app: ParsedApp,
  options: ParseJsValueOptions
): ComponentChild | null {
  const args = expr.get("arguments");
  if (args.length !== 2) {
    state.errors.push({
      message: `useEffect() requires exactly 2 arguments, received ${args.length}`,
      node: args.length > 2 ? args[2].node : expr.node.callee,
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
  if (depElements.length !== 0) {
    state.errors.push({
      message: `useEffect() dependency array must be empty, received ${depElements.length} elements`,
      node: depElements[0].node,
      severity: "error",
    });
    return null;
  }

  // onMount/onUnmount effect, no dependencies
  const _onMountHandlers = parseEventHandlers(
    callbackBody,
    state,
    app,
    options,
    true
  );
  const onMountHandlers = Array.isArray(_onMountHandlers)
    ? _onMountHandlers
    : _onMountHandlers
      ? [_onMountHandlers]
      : [];

  const onUnmountHandlers: EventHandler[] = [];
  for (const stmt of callbackBody.get("body")) {
    if (stmt.isReturnStatement()) {
      const cleanup = stmt.get("argument");
      if (!cleanup.node) {
        break;
      }
      if (!isGeneralFunctionExpression(cleanup)) {
        state.errors.push({
          message: `useEffect() cleanup function must be a function expression, received ${cleanup.type}`,
          node: cleanup.node,
          severity: "error",
        });
        break;
      }
      const cleanupParams = cleanup.get("params");
      if (cleanupParams.length > 0) {
        state.errors.push({
          message: `useEffect() cleanup function must not have parameters, received ${cleanupParams.length}`,
          node: cleanupParams[0].node,
          severity: "error",
        });
        break;
      }
      const cleanupBody = cleanup.get("body");
      const handlers = parseEventHandlers(cleanupBody, state, app, options);
      if (handlers) {
        if (Array.isArray(handlers)) {
          onUnmountHandlers.push(...handlers);
        } else {
          onUnmountHandlers.push(handlers);
        }
      }
      break;
    }
  }

  if (onMountHandlers.length > 0 || onUnmountHandlers.length > 0) {
    return {
      name: "eo-event-agent",
      portal: true,
      properties: {},
      lifeCycle: {
        onMount: onMountHandlers,
        onUnmount: onUnmountHandlers,
      },
    };
  }

  return null;
}
