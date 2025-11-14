import type * as t from "@babel/types";
import type { ComponentChild, SourceFile } from "./modules/interfaces.js";
import type { SYMBOL_RENDER_USE_BRICK } from "./modules/constants.js";

export interface ParseOptions {
  reward?: boolean;
  workspace?: string;
  withContexts?: string[];
  libs?: SourceFile[];
}

export interface ParseError {
  message: string;
  node: t.Node | null | undefined;
  severity: "notice" | "warning" | "error" | "fatal";
  filePath?: string;
}

export type { ComponentChild as Component };

export interface DataSource {
  name: string;
  api: string;
  http?: boolean;
  tool?: ToolInfo;
  objectId?: string;
  params?: string | Record<string, unknown> | unknown[];
  ambiguousParams?: unknown;
  transform?: string;
  rejectTransform?: string;
  scope?: "global" | "template";
  config?: DataSourceConfig;
  isRawProvider?: boolean;
}

export interface ToolInfo {
  conversationId: string;
  stepId: string;
}

export interface DataSourceConfig {
  enabled?: unknown;
  fallback?: unknown;
  async?: unknown;
}

export interface Events {
  [key: string]: EventHandler | EventHandler[];
}

export type EventHandler =
  | TypeEventHandlerOfUpdateVariable
  | TypeEventHandlerOfRefreshDataSource
  | TypeEventHandlerOfCallRef
  | TypeEventHandlerOfCallSelector
  | TypeEventHandlerOfUpdateRef
  | TypeEventHandlerOfUpdateSelector
  | TypeEventHandlerOfShowMessage
  | TypeEventHandlerOfHandleHttpError
  | TypeEventHandlerOfCallAPI
  | TypeEventHandlerOfDispatchEvent
  | TypeEventHandlerOfNavigate
  | TypeEventHandlerOfStore
  | TypeEventHandlerOfConsole
  | TypeEventHandlerOfEvent
  | TypeEventHandlerOfConditional;

export type EventHandlerWithCallback =
  | TypeEventHandlerOfCallAPI
  | TypeEventHandlerOfRefreshDataSource
  | TypeEventHandlerOfCallRef
  | TypeEventHandlerOfCallSelector;

export interface EventHandlerBase {
  action: string;
  key?: string;
}

export interface TypeEventHandlerOfUpdateVariable extends EventHandlerBase {
  action: "update_variable";
  payload: {
    name: string;
    value: any;
    scope?: "global" | "template";
  };
}

export interface TypeEventHandlerOfRefreshDataSource extends EventHandlerBase {
  action: "refresh_data_source";
  payload: {
    name: string;
    scope?: "global" | "template";
  };
  callback?: TypeEventHandlerCallback;
}

export interface TypeEventHandlerOfCallRef extends EventHandlerBase {
  action: "call_ref";
  payload: {
    ref: string;
    method: string;
    args?: any[];
    scope?: "global" | "template";
  };
  callback?: TypeEventHandlerCallback;
}

export interface TypeEventHandlerOfCallSelector extends EventHandlerBase {
  action: "call_selector";
  payload: {
    selector: string;
    method: string;
    args?: any[];
  };
  callback?: TypeEventHandlerCallback;
}

export interface TypeEventHandlerOfUpdateRef extends EventHandlerBase {
  action: "update_ref";
  payload: {
    ref: string;
    properties: Record<string, any>;
    scope?: "global" | "template";
  };
}

export interface TypeEventHandlerOfUpdateSelector extends EventHandlerBase {
  action: "update_selector";
  payload: {
    selector: string;
    properties: Record<string, any>;
    scope?: "global" | "template";
  };
}

export interface TypeEventHandlerOfShowMessage extends EventHandlerBase {
  action: "show_message";
  payload: {
    type: "info" | "success" | "warn" | "error";
    content: string;
  };
}

export interface TypeEventHandlerOfHandleHttpError extends EventHandlerBase {
  action: "handle_http_error";
  payload: unknown;
}

export interface TypeEventHandlerOfCallAPI extends EventHandlerBase {
  action: "call_api";
  payload: {
    api: string;
    http?: boolean;
    tool?: ToolInfo;
    params?: any;
    objectId?: string;
    isRawProvider?: boolean;
  };
  callback?: TypeEventHandlerCallback;
}

export interface TypeEventHandlerOfDispatchEvent extends EventHandlerBase {
  action: "dispatch_event";
  payload: {
    type: string;
    detail?: unknown;
  };
}

export interface TypeEventHandlerOfNavigate extends EventHandlerBase {
  action: "navigate";
  payload: {
    method: "push" | "replace" | "reload" | "pushQuery" | "replaceQuery";
    args: unknown[];
  };
}

export interface TypeEventHandlerOfStore extends EventHandlerBase {
  action: "store";
  payload: {
    type: "local" | "session";
    method: "setItem" | "removeItem";
    args: unknown[];
  };
}

export interface TypeEventHandlerOfConsole extends EventHandlerBase {
  action: "console";
  payload: {
    method: "log" | "info" | "warn" | "error";
    args: unknown[];
  };
}

export interface TypeEventHandlerOfEvent extends EventHandlerBase {
  action: "event";
  payload: {
    method: "preventDefault" | "stopPropagation";
  };
}

export interface TypeEventHandlerOfConditional extends EventHandlerBase {
  action: "conditional";
  payload: {
    test: string | boolean | undefined;
    consequent: EventHandler | EventHandler[] | null;
    alternate: EventHandler | EventHandler[] | null;
  };
}

export interface TypeEventHandlerCallback {
  success?: EventHandler[] | null;
  error?: EventHandler[] | null;
  finally?: EventHandler[] | null;
}

export interface LifeCycle {
  onMount?: EventHandler | EventHandler[];
  onUnmount?: EventHandler | EventHandler[];
}

export interface RenderUseBrick {
  type: typeof SYMBOL_RENDER_USE_BRICK;
  params: string[];
  children: ComponentChild[];
}

export type {
  ParsedApp,
  ParsedModule,
  ComponentChild,
  SourceFile,
  ComponentReference,
  ModulePart,
  ModulePartOfComponent,
  ModulePartOfFunction,
  ModulePartOfContext,
} from "./modules/interfaces.js";
