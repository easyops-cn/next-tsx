import type { BrickEventHandler, BrickEventsMap } from "@next-core/types";
import type {
  Component,
  EventHandler,
  TypeEventHandlerCallback,
} from "@next-tsx/parser";
import type { ConvertOptions } from "./interfaces.js";

export function convertEvents(component: Component, options: ConvertOptions) {
  const events: BrickEventsMap = {};
  for (const [event, handler] of Object.entries(component.events ?? {})) {
    switch (component.name) {
      case "Table":
        switch (event) {
          case "select": {
            const action = convertEventHandlers(handler, options);
            if (action) {
              events["row.select.v2"] = action;
            }
            break;
          }
          case "sort": {
            const action = convertEventHandlers(handler, options);
            if (action) {
              events["sort.change"] = action;
            }
            break;
          }
          case "paginate": {
            const action = convertEventHandlers(handler, options);
            if (action) {
              events["page.change"] = action;
            }
            break;
          }
        }
        break;
      case "Button":
        if (event === "click") {
          const action = convertEventHandlers(handler, options);
          if (action) {
            events.click = action;
          }
        }
        break;
      case "Search":
        if (event === "search") {
          const action = convertEventHandlers(handler, options);
          if (action) {
            events.search = action;
          }
        }
        break;
      case "Select":
        if (event === "change") {
          const action = convertEventHandlers(handler, options);
          if (action) {
            events["change.v2"] = action;
          }
        }
        break;
      default: {
        const action = convertEventHandlers(handler, options);
        if (action) {
          events[event] = action;
        }
      }
    }
  }
  return Object.keys(events).length > 0 ? events : undefined;
}

export function convertEventHandlers(
  handler: EventHandler | EventHandler[] | null,
  options: ConvertOptions
): BrickEventHandler[] | undefined {
  if (!handler) {
    return;
  }
  const list = (Array.isArray(handler) ? handler : [handler])
    .map((hdl) => convertEventHandler(hdl, options))
    .filter(Boolean) as BrickEventHandler[];
  return list.length > 0 ? list : undefined;
}

function convertEventHandler(
  handler: EventHandler,
  options: ConvertOptions
): BrickEventHandler | undefined {
  switch (handler?.action) {
    case "update_variable":
      return {
        key: handler.key,
        action:
          handler.payload.scope === "template" ? "state.set" : "context.set",
        args: [handler.payload.name, handler.payload.value],
      };
    case "refresh_data_source":
      return {
        key: handler.key,
        action:
          handler.payload.scope === "template"
            ? "state.refresh"
            : "context.refresh",
        args: [handler.payload.name],
        callback: convertCallback(handler.callback, options),
      };
    case "call_api": {
      const { api, http, tool, params, isRawProvider } = handler.payload;

      return {
        key: handler.key,
        ...(isRawProvider
          ? {
              useProvider: api,
              args: params,
            }
          : http
            ? {
                useProvider: "basic.http-request",
                args: [api, params],
              }
            : tool
              ? {
                  useProvider: "ai-portal.call-tool",
                  args: [tool, params],
                }
              : {
                  useProvider: `${api}${api.includes(":") ? "" : ":*"}`,
                  params,
                }),
        callback: convertCallback(handler.callback, options),
      };
    }
    case "update_ref":
      return {
        key: handler.key,
        ...(handler.payload.scope === "template"
          ? {
              targetRef: handler.payload.ref,
            }
          : {
              target: `${options.rootId ? `[data-root-id="${options.rootId}"] ` : ""}[data-ref="${handler.payload.ref}"]`,
            }),
        properties: handler.payload.properties,
      };
    case "update_selector":
      return {
        key: handler.key,
        target: handler.payload.selector,
        properties: handler.payload.properties,
      };
    case "call_ref":
      return {
        key: handler.key,
        ...(handler.payload.scope === "template"
          ? {
              targetRef: handler.payload.ref,
            }
          : {
              target: `${options.rootId ? `[data-root-id="${options.rootId}"] ` : ""}[data-ref="${handler.payload.ref}"]`,
            }),
        method: handler.payload.method,
        args: handler.payload.args,
        callback: convertCallback(handler.callback, options),
      };
    case "call_selector":
      return {
        key: handler.key,
        target: handler.payload.selector,
        method: handler.payload.method,
        args: handler.payload.args,
        callback: convertCallback(handler.callback, options),
      };
    case "navigate":
      return {
        key: handler.key,
        action: `history.${handler.payload.method}`,
        args: handler.payload.args,
      };
    case "store":
      return {
        key: handler.key,
        action: `${handler.payload.type}Storage.${handler.payload.method}`,
        args: handler.payload.args,
      };
    case "show_message":
      return {
        key: handler.key,
        action: `message.${handler.payload.type}` as "message.info",
        args: [handler.payload.content],
      };
    case "handle_http_error":
      return {
        key: handler.key,
        action: "handleHttpError",
      };
    case "dispatch_event":
      return {
        key: handler.key,
        action: "tpl.dispatchEvent",
        args: [handler.payload.type, { detail: handler.payload.detail }],
      };
    case "console":
      return {
        key: handler.key,
        action: `console.${handler.payload.method}`,
        args: handler.payload.args,
      };
    case "window":
      return {
        key: handler.key,
        action: `window.${handler.payload.method}`,
        args: handler.payload.args,
      };
    case "event":
      return {
        key: handler.key,
        action: `event.${handler.payload.method}`,
        args: handler.payload.args,
      };
    case "conditional":
      return {
        key: handler.key,
        if: handler.payload.test,
        then: convertEventHandlers(handler.payload.consequent, options) ?? [],
        else: convertEventHandlers(handler.payload.alternate, options),
      };
  }
}

function convertCallback(
  callback: TypeEventHandlerCallback | undefined,
  options: ConvertOptions
): {
  success?: BrickEventHandler[];
  error?: BrickEventHandler[];
} {
  const success = callback?.success
    ? convertEventHandlers(callback.success, options)
    : undefined;

  const error = callback?.error
    ? convertEventHandlers(callback.error, options)
    : undefined;

  const finallyCallback = callback?.finally
    ? convertEventHandlers(callback.finally, options)
    : undefined;

  return {
    ...(success && { success }),
    ...(error && { error }),
    ...(finallyCallback && { finally: finallyCallback }),
  };
}
