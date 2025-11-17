import type { NodePath } from "@babel/traverse";
import type * as t from "@babel/types";
import type {
  BindingInfo,
  EventHandler,
  ParseJsValueOptions,
  ParsedApp,
  ParsedModule,
} from "./interfaces.js";
import type {
  TypeEventHandlerOfShowMessage,
  TypeEventHandlerOfHandleHttpError,
  TypeEventHandlerCallback,
} from "../interfaces.js";
import { parseJsValue } from "./parseJsValue.js";
import {
  CALL_API_LIST,
  CONSOLE_METHODS,
  EVENT_METHODS,
  HISTORY_METHODS,
  type HistoryMethodType,
} from "./constants.js";
import { parseCallApi } from "./parseCallApi.js";
import {
  isEventHandlerWithCallback,
  isGeneralCallExpression,
  isGeneralFunctionExpression,
  isGeneralMemberExpression,
  validateGlobalApi,
} from "./validations.js";
import { getContextReferenceEventAgentId } from "./getContextReference.js";
import { convertJsxEventAttr } from "./parseJSXElement.js";

export function parseEvent(
  path: NodePath<t.Node>,
  state: ParsedModule,
  app: ParsedApp,
  options: ParseJsValueOptions,
  eventAccessor?: string
): EventHandler[] | null {
  if (!isGeneralFunctionExpression(path)) {
    state.errors.push({
      message: `Event handler must be a function expression, but got ${path.type}`,
      node: path.node,
      severity: "error",
    });
    return null;
  }

  const params = path.get("params");
  if (params.length > 1) {
    state.errors.push({
      message: `Event handler function must have at most one parameter, but got ${params.length}`,
      node: params[1].node,
      severity: "error",
    });
    return null;
  }

  const param = params[0];
  const eventOptions: ParseJsValueOptions = {
    ...options,
    modifier: undefined,
    eventBinding: undefined,
  };
  if (param) {
    if (!param.isIdentifier()) {
      state.errors.push({
        message: `Event handler function parameter must be an identifier, but got ${param.type}`,
        node: param.node,
        severity: "error",
      });
      return null;
    }
    eventOptions.eventBinding = { id: param.node, eventAccessor };
    eventOptions.eventKeyBindings ??= [];
    eventOptions.eventKeyBindings.push(eventOptions.eventBinding);
  }

  const body = path.get("body");
  const handler = parseEventHandlers(body, state, app, eventOptions);
  if (!handler) {
    return null;
  }

  return ([] as EventHandler[]).concat(handler);
}

export function parseEventHandlers(
  path: NodePath<t.Statement | t.Expression | null | undefined>,
  state: ParsedModule,
  app: ParsedApp,
  options: ParseJsValueOptions
): EventHandler | EventHandler[] | null {
  if (path.isBlockStatement()) {
    return path
      .get("body")
      .flatMap((stmtPath) => parseEventHandlers(stmtPath, state, app, options))
      .filter((h): h is EventHandler => h !== null);
  }

  if (path.isIfStatement()) {
    const test = parseJsValue(path.get("test"), state, app, options) as
      | string
      | boolean
      | undefined;
    return {
      key: options.eventBinding?.id.name,
      action: "conditional",
      payload: {
        test,
        consequent: parseEventHandlers(
          path.get("consequent"),
          state,
          app,
          options
        ),
        alternate: path.node.alternate
          ? parseEventHandlers(path.get("alternate"), state, app, options)
          : null,
      },
    };
  }

  if (path.isExpressionStatement()) {
    return parseEventHandler(path.get("expression"), state, app, options);
  }

  if (path.isExpression()) {
    return parseEventHandler(path, state, app, options);
  }

  state.errors.push({
    message: `Unsupported event handler`,
    node: path.node,
    severity: "error",
  });

  return null;
}

function parseEventHandler(
  path: NodePath<t.Expression | null | undefined>,
  state: ParsedModule,
  app: ParsedApp,
  options: ParseJsValueOptions
): EventHandler | null {
  if (isGeneralCallExpression(path)) {
    const callee = path.get("callee");
    const args = path.get("arguments");
    if (callee.isIdentifier()) {
      if (validateGlobalApi(callee, "showMessage")) {
        if (args.length !== 1) {
          state.errors.push({
            message: `"showMessage()" expects exactly 1 argument, but got ${args.length}`,
            node: path.node,
            severity: "error",
          });
          return null;
        }
        const payload = parseJsValue(args[0], state, app, options);
        return {
          key: options.eventBinding?.id.name,
          action: "show_message",
          payload,
        } as TypeEventHandlerOfShowMessage;
      }

      if (validateGlobalApi(callee, "handleHttpError")) {
        if (args.length !== 1) {
          state.errors.push({
            message: `"handleHttpError()" expects exactly 1 argument, but got ${args.length}`,
            node: path.node,
            severity: "error",
          });
          return null;
        }
        const payload = parseJsValue(args[0], state, app, options);
        return {
          key: options.eventBinding?.id.name,
          action: "handle_http_error",
          payload,
        } as TypeEventHandlerOfHandleHttpError;
      }

      for (const name of CALL_API_LIST) {
        if (validateGlobalApi(callee, name)) {
          const payload = parseCallApi(path, state, app, options);
          if (!payload) {
            return null;
          }
          state.contracts.add(payload.api);
          return {
            key: options.eventBinding?.id.name,
            action: "call_api",
            payload,
          };
        }
      }

      // Assert: callee.isReferencedIdentifier()
      const bindingId = callee.scope.getBindingIdentifier(callee.node.name);
      let binding: BindingInfo | undefined;
      if (bindingId) {
        binding = options.component?.bindingMap.get(bindingId);
      }
      if (!binding) {
        state.errors.push({
          message: `Function "${callee.node.name}" is not defined`,
          node: callee.node,
          severity: "error",
        });
        return null;
      }
      switch (binding.kind) {
        case "setState":
          return {
            key: options.eventBinding?.id.name,
            action: "update_variable",
            payload: {
              name: binding.id.name,
              value:
                args[0] === undefined
                  ? undefined
                  : parseJsValue(args[0], state, app, {
                      ...options,
                      modifier: undefined,
                    }),
              scope:
                options.component!.type === "template" ? "template" : "global",
            },
          };
        case "refetch":
          return {
            key: options.eventBinding?.id.name,
            action: "refresh_data_source",
            payload: {
              name: binding.resourceId!.name,
              scope:
                options.component!.type === "template" ? "template" : "global",
            },
          };
        case "context":
          return {
            key: options.eventBinding?.id.name,
            action: "call_selector",
            payload: {
              selector: `#${getContextReferenceEventAgentId(binding.contextProvider!.name)}`,
              method: "trigger",
              args: [
                {
                  name: binding.contextKey!,
                  payload:
                    args[0] === undefined
                      ? undefined
                      : parseJsValue(args[0], state, app, {
                          ...options,
                          modifier: undefined,
                        }),
                },
              ],
            },
          };
        case "eventHandlerParam": {
          if (args.length > 1) {
            state.errors.push({
              message: `Event dispatcher "${callee.node.name}" expects at most 1 argument, but got ${args.length}`,
              node: path.node,
              severity: "error",
            });
            return null;
          }
          let detail: unknown;
          if (args.length > 0) {
            const event = args[0];
            if (!event.isObjectExpression()) {
              state.errors.push({
                message: `Event dispatcher "${callee.node.name}" argument must be an object expression, but got ${event.type}`,
                node: event.node,
                severity: "error",
              });
              return null;
            }
            for (const prop of event.get("properties")) {
              if (!prop.isObjectProperty()) {
                state.errors.push({
                  message: `Event dispatcher "${callee.node.name}" argument object expression must have only object properties, but got ${prop.type}`,
                  node: prop.node,
                  severity: "error",
                });
                return null;
              }
              if (prop.node.computed) {
                state.errors.push({
                  message: `Event dispatcher "${callee.node.name}" argument object expression must not have computed properties`,
                  node: prop.node,
                  severity: "error",
                });
                return null;
              }
              const key = prop.get("key");
              if (!key.isIdentifier() || key.node.name !== "detail") {
                state.errors.push({
                  message: `Event dispatcher "${callee.node.name}" argument object expression property key must be an identifier with name "detail", but got ${key.type}${key.isIdentifier() ? ` (name: ${key.node.name})` : ""}`,
                  node: key.node,
                  severity: "error",
                });
                return null;
              }
              detail = parseJsValue(prop.get("value"), state, app, {
                ...options,
                modifier: undefined,
              });
            }
          }
          return {
            key: options.eventBinding?.id.name,
            action: "dispatch_event",
            payload: {
              type: convertJsxEventAttr(binding.id.name),
              detail,
            },
          };
        }
        case "eventCallback":
          if (args.length > 1) {
            state.errors.push({
              message: `Event callback "${callee.node.name}" expects at most 1 argument, but got ${args.length}`,
              node: path.node,
              severity: "error",
            });
            return null;
          }
          return {
            key: options.eventBinding?.id.name,
            action: "call_ref",
            payload: {
              ref: binding.callbackRef!,
              method: "trigger",
              args: [
                args.length > 0
                  ? parseJsValue(args[0], state, app, {
                      ...options,
                      modifier: undefined,
                    })
                  : undefined,
              ],
              scope:
                options.component!.type === "template" ? "template" : "global",
            },
          };
        default:
          state.errors.push({
            message: `"${callee.node.name}" (${binding.kind}) is invalid or not callable`,
            node: callee.node,
            severity: "error",
          });
          return null;
      }
    } else if (isGeneralMemberExpression(callee)) {
      if (callee.node.computed) {
        state.errors.push({
          message: `Event handler call expression with computed member expression is not supported`,
          node: callee.node,
          severity: "error",
        });
        return null;
      }
      const object = callee.get("object");
      const property = callee.get("property");
      if (!property.isIdentifier()) {
        state.errors.push({
          message: `Event handler call expression with non-identifier property is not supported`,
          node: property.node,
          severity: "error",
        });
        return null;
      }
      const method = property.node.name;

      if (method === "then" || method === "catch" || method === "finally") {
        return parseHandlerCallback(object, method, args, state, app, options);
      }

      if (isGeneralMemberExpression(object)) {
        const objectProperty = object.get("property");
        if (
          !object.node.computed &&
          objectProperty.isIdentifier() &&
          objectProperty.node.name === "current"
        ) {
          const refObject = object.get("object");
          if (refObject.isIdentifier()) {
            const refBindingId = refObject.scope.getBindingIdentifier(
              refObject.node.name
            );
            let refBinding: BindingInfo | undefined;
            if (refBindingId) {
              refBinding = options.component?.bindingMap.get(refBindingId);
            }
            if (!refBinding) {
              state.errors.push({
                message: `Variable "${refObject.node.name}" is not defined`,
                node: refObject.node,
                severity: "error",
              });
              return null;
            }
            if (refBinding.kind !== "ref") {
              state.errors.push({
                message: `Variable "${refObject.node.name}" is not a ref, but a ${refBinding.kind}`,
                node: refObject.node,
                severity: "error",
              });
              return null;
            }
            return {
              key: options.eventBinding?.id.name,
              action: "call_ref",
              payload: {
                ref: refBinding.refName!,
                method,
                args: args.map((arg) => parseJsValue(arg, state, app, options)),
                scope:
                  options.component!.type === "template"
                    ? "template"
                    : "global",
              },
            };
          }
        }
      }

      if (object.isIdentifier()) {
        // Assert: object.isReferencedIdentifier()
        const bindingId = object.scope.getBindingIdentifier(object.node.name);
        if (bindingId) {
          if (bindingId === options.eventBinding?.id) {
            if (!EVENT_METHODS.includes(method as "preventDefault")) {
              state.errors.push({
                message: `"${object.node.name}.${method}()" is not supported in event handler`,
                node: property.node,
                severity: "error",
              });
              return null;
            }
            return {
              key: options.eventBinding?.id.name,
              action: "event",
              payload: {
                method: method as "preventDefault",
                ...(options.eventBinding.eventAccessor
                  ? {
                      args: [
                        `<% EVENT${options.eventBinding.eventAccessor} %>`,
                      ],
                    }
                  : null),
              },
            };
          }

          const binding = options.component?.bindingMap.get(bindingId);
          if (binding) {
            switch (binding.kind) {
              case "history": {
                if (!HISTORY_METHODS.includes(method as HistoryMethodType)) {
                  state.errors.push({
                    message: `"history.${method}()" is not supported in event handler`,
                    node: property.node,
                    severity: "error",
                  });
                  return null;
                }
                return {
                  key: options.eventBinding?.id.name,
                  action: "navigate",
                  payload: {
                    method: method as HistoryMethodType,
                    args: args.map((arg) =>
                      parseJsValue(arg, state, app, options)
                    ),
                  },
                };
              }
            }
          }
        } else {
          // No binding id, it's a global object
          switch (object.node.name) {
            case "console": {
              // Parse `console.*(...)`
              if (!CONSOLE_METHODS.includes(method as "log")) {
                state.errors.push({
                  message: `"console.${method}()" is not supported in event handler`,
                  node: property.node,
                  severity: "error",
                });
                return null;
              }
              return {
                key: options.eventBinding?.id.name,
                action: "console",
                payload: {
                  method: method as "log",
                  args: args.map((arg) =>
                    parseJsValue(arg, state, app, options)
                  ),
                },
              };
            }
            case "Object": {
              // Parse `Object.assign(ref.current, { ... })`
              // Parse `Object.assign(querySelector("..."), { ... })`
              if (method !== "assign") {
                state.errors.push({
                  message: `"Object.${method}()" is not supported in event handler`,
                  node: property.node,
                  severity: "error",
                });
                return null;
              }
              if (args.length !== 2) {
                state.errors.push({
                  message: `"Object.${method}()" expects exactly 2 arguments, but got ${args.length}`,
                  node: property.node,
                  severity: "error",
                });
                return null;
              }
              const [refTarget, props] = args;

              // Check props
              if (!props.isObjectExpression()) {
                state.errors.push({
                  message: `"Object.${method}()" expects the second argument to be an object expression, but got ${props.type}`,
                  node: props.node,
                  severity: "error",
                });
                return null;
              }
              const invalidProp = props.node.properties.find(
                (p) => p.type !== "ObjectProperty"
              );
              if (invalidProp) {
                state.errors.push({
                  message: `"Object.${method}()" expects the second argument to have only object properties, but got ${invalidProp.type}`,
                  node: invalidProp,
                  severity: "error",
                });
                return null;
              }

              // Check target
              if (isGeneralMemberExpression(refTarget)) {
                if (refTarget.node.computed) {
                  state.errors.push({
                    message: `"Object.${method}()" expects the first argument to be a non-computed member expression`,
                    node: refTarget.node,
                    severity: "error",
                  });
                  return null;
                }
                const refTargetObject = refTarget.get("object");
                if (!refTargetObject.isIdentifier()) {
                  state.errors.push({
                    message: `"Object.${method}()" expects the first argument to have an identifier as object, but got ${refTargetObject.type}`,
                    node: refTargetObject.node,
                    severity: "error",
                  });
                  return null;
                }
                const refBindingId = refTargetObject.scope.getBindingIdentifier(
                  refTargetObject.node.name
                );
                let refBinding: BindingInfo | undefined;
                if (refBindingId) {
                  refBinding = options.component?.bindingMap.get(refBindingId);
                }
                if (!refBinding || refBinding.kind !== "ref") {
                  state.errors.push({
                    message: `"Object.${method}()" expects the first argument to be a ref binding, but got ${refBinding?.kind}`,
                    node: refTargetObject.node,
                    severity: "error",
                  });
                  return null;
                }
                const refTargetProperty = refTarget.get("property");
                if (
                  !refTargetProperty.isIdentifier() ||
                  refTargetProperty.node.name !== "current"
                ) {
                  state.errors.push({
                    message: `"Object.${method}()" expects the first argument to have "current" as property, but got ${
                      refTargetProperty.type
                    }${
                      refTargetProperty.isIdentifier()
                        ? ` (name: ${refTargetProperty.node.name})`
                        : ""
                    }`,
                    node: refTargetProperty.node,
                    severity: "error",
                  });
                  return null;
                }

                return {
                  key: options.eventBinding?.id.name,
                  action: "update_ref",
                  payload: {
                    ref: refBinding.refName!,
                    properties: parseJsValue(
                      props,
                      state,
                      app,
                      options
                    ) as Record<string, any>,
                    scope:
                      options.component!.type === "template"
                        ? "template"
                        : "global",
                  },
                };
              } else if (isGeneralCallExpression(refTarget)) {
                const innerCallee = refTarget.get("callee");
                if (
                  innerCallee.isIdentifier() &&
                  validateGlobalApi(innerCallee, "querySelector")
                ) {
                  const innerArgs = refTarget.get("arguments");
                  if (innerArgs.length !== 1) {
                    state.errors.push({
                      message: `"querySelector()" expects exactly 1 argument, but got ${innerArgs.length}`,
                      node: refTarget.node,
                      severity: "error",
                    });
                    return null;
                  }
                  return {
                    key: options.eventBinding?.id.name,
                    action: "update_selector",
                    payload: {
                      selector: parseJsValue(
                        innerArgs[0],
                        state,
                        app,
                        options
                      ) as string,
                      properties: parseJsValue(
                        props,
                        state,
                        app,
                        options
                      ) as Record<string, any>,
                    },
                  };
                }
              }

              state.errors.push({
                message: `"Object.${method}()" expects the first argument to be a ref or querySelector call expression`,
                node: refTarget.node,
                severity: "error",
              });
              return null;
            }
          }
        }
        const isLocalStore = validateGlobalApi(object, "localStore");
        const isSessionStore =
          !isLocalStore && validateGlobalApi(object, "sessionStore");
        if (isLocalStore || isSessionStore) {
          if (method !== "setItem" && method !== "removeItem") {
            state.errors.push({
              message: `"${object.node.name}.${method}()" is not supported in event handler`,
              node: property.node,
              severity: "error",
            });
            return null;
          }
          return {
            key: options.eventBinding?.id.name,
            action: "store",
            payload: {
              type: isLocalStore ? "local" : "session",
              method,
              args: args.map((arg) => parseJsValue(arg, state, app, options)),
            },
          };
        }
      }

      if (isGeneralCallExpression(object)) {
        const innerCallee = object.get("callee");
        if (
          innerCallee.isIdentifier() &&
          validateGlobalApi(innerCallee, "querySelector")
        ) {
          const innerArgs = object.get("arguments");
          if (innerArgs.length !== 1) {
            state.errors.push({
              message: `"querySelector()" expects exactly 1 argument, but got ${innerArgs.length}`,
              node: object.node,
              severity: "error",
            });
            return null;
          }
          return {
            key: options.eventBinding?.id.name,
            action: "call_selector",
            payload: {
              selector: parseJsValue(
                innerArgs[0],
                state,
                app,
                options
              ) as string,
              method,
              args: args.map((arg) => parseJsValue(arg, state, app, options)),
            },
          };
        }
      }

      state.errors.push({
        message: "Invalid event handler",
        node: callee.node,
        severity: "error",
      });
      return null;
    }
  }

  // Parse `ref.current.prop = value` assignment
  // Parse `querySelector("...").prop = value` assignment
  if (path.isAssignmentExpression()) {
    if (path.node.operator !== "=") {
      state.errors.push({
        message: `Only simple assignment is supported in event handler, but got operator "${path.node.operator}"`,
        node: path.node,
        severity: "error",
      });
      return null;
    }
    const left = path.get("left");
    const right = path.get("right");
    if (!left.isMemberExpression()) {
      state.errors.push({
        message: `Left side of assignment in event handler must be a member expression, but got ${left.type}`,
        node: left.node,
        severity: "error",
      });
      return null;
    }
    if (left.node.computed) {
      state.errors.push({
        message: `Left side of assignment in event handler must not be a computed member expression`,
        node: left.node,
        severity: "error",
      });
      return null;
    }
    const object = left.get("object");
    const property = left.get("property");
    if (!property.isIdentifier()) {
      state.errors.push({
        message: `Left side of assignment in event handler must be a member expression with identifier as its property, but got ${property.type}`,
        node: property.node,
        severity: "error",
      });
      return null;
    }
    if (object.isMemberExpression()) {
      if (object.node.computed) {
        state.errors.push({
          message: `Left side of assignment in event handler must not be a computed member expression`,
          node: object.node,
          severity: "error",
        });
        return null;
      }
      const objectProperty = object.get("property");
      if (
        !objectProperty.isIdentifier() ||
        objectProperty.node.name !== "current"
      ) {
        state.errors.push({
          message: `Left side of assignment in event handler must be a member expression with "current" as its object property, but got ${objectProperty.type}${
            objectProperty.isIdentifier()
              ? ` (name: ${objectProperty.node.name})`
              : ""
          }`,
          node: objectProperty.node,
          severity: "error",
        });
        return null;
      }
      const refObject = object.get("object");
      if (!refObject.isIdentifier()) {
        state.errors.push({
          message: `Left side of assignment in event handler must be a member expression with identifier as its object, but got ${refObject.type}`,
          node: refObject.node,
          severity: "error",
        });
        return null;
      }
      const refBindingId = refObject.scope.getBindingIdentifier(
        refObject.node.name
      );
      let refBinding: BindingInfo | undefined;
      if (refBindingId) {
        refBinding = options.component?.bindingMap.get(refBindingId);
      }
      if (!refBinding) {
        state.errors.push({
          message: `Variable "${refObject.node.name}" is not defined`,
          node: refObject.node,
          severity: "error",
        });
        return null;
      }
      if (refBinding.kind !== "ref") {
        state.errors.push({
          message: `Variable "${refObject.node.name}" is not a ref, but a ${refBinding.kind}`,
          node: refObject.node,
          severity: "error",
        });
        return null;
      }
      return {
        key: options.eventBinding?.id.name,
        action: "update_ref",
        payload: {
          ref: refBinding.refName!,
          properties: {
            [property.node.name]: parseJsValue(right, state, app, options),
          },
          scope: options.component!.type === "template" ? "template" : "global",
        },
      };
    } else if (isGeneralCallExpression(object)) {
      const innerCallee = object.get("callee");
      if (
        innerCallee.isIdentifier() &&
        validateGlobalApi(innerCallee, "querySelector")
      ) {
        const innerArgs = object.get("arguments");
        if (innerArgs.length !== 1) {
          state.errors.push({
            message: `"querySelector()" expects exactly 1 argument, but got ${innerArgs.length}`,
            node: object.node,
            severity: "error",
          });
          return null;
        }
        return {
          key: options.eventBinding?.id.name,
          action: "update_selector",
          payload: {
            selector: parseJsValue(innerArgs[0], state, app, options) as string,
            properties: {
              [property.node.name]: parseJsValue(right, state, app, options),
            },
          },
        };
      }
    }

    state.errors.push({
      message: `Left side of assignment in event handler must be a ref or querySelector call expression`,
      node: left.node,
      severity: "error",
    });
    return null;
  }

  state.errors.push({
    message: `Unsupported event handler: ${path.node?.type}`,
    node: path.node,
    severity: "error",
  });

  return null;
}

export function parseHandlerCallback(
  object: NodePath<t.Expression>,
  method: "then" | "catch" | "finally",
  args: NodePath<t.Node>[],
  state: ParsedModule,
  app: ParsedApp,
  options: ParseJsValueOptions
): EventHandler | null {
  const handler = parseEventHandler(object, state, app, options);
  if (!handler) {
    return null;
  }

  if (!isEventHandlerWithCallback(handler)) {
    state.errors.push({
      message: `Event handler "${handler.action}" does not support "${method}()" callback`,
      node: object.node,
      severity: "error",
    });
    return null;
  }

  if (method === "then" && (args.length === 0 || args.length > 2)) {
    state.errors.push({
      message: `"then()" expects 1 or 2 arguments, but got ${args.length}`,
      node: object.node,
      severity: "error",
    });
    return null;
  }

  if (method !== "then" && args.length !== 1) {
    state.errors.push({
      message: `"${method}()" expects exactly 1 argument, but got ${args.length}`,
      node: object.node,
      severity: "error",
    });
    return null;
  }

  let successCallback: EventHandler[] | null | undefined;
  let errorCallback: EventHandler[] | null | undefined;
  let finallyCallback: EventHandler[] | null | undefined;
  const callback = parseEvent(args[0], state, app, options, ".detail");
  if (method === "catch") {
    errorCallback = callback;
  } else if (method === "finally") {
    finallyCallback = callback;
  } else {
    successCallback = callback;
    if (args.length > 1) {
      errorCallback = parseEvent(args[1], state, app, options, ".detail");
    }
  }
  return {
    ...handler,
    callback: mergeCallbacks(handler.callback, {
      success: successCallback,
      error: errorCallback,
      finally: finallyCallback,
    }),
  };
}

function mergeCallbacks(
  previous: TypeEventHandlerCallback | undefined,
  next: TypeEventHandlerCallback
): TypeEventHandlerCallback {
  if (!previous) {
    return next;
  }

  return {
    success: [...(previous.success ?? []), ...(next.success ?? [])],
    error: [...(previous.error ?? []), ...(next.error ?? [])],
    finally: [...(previous.finally ?? []), ...(next.finally ?? [])],
  };
}
