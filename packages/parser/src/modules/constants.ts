import type { BindingInfo } from "./interfaces.js";

export const MODULE_SOURCE = "@next-tsx/core";

export const CALL_API_LIST = [
  "callApi",
  "callHttp",
  "callTool",
  "callProvider",
  "copyText",
  "showDialog",
] as const;

export type CallApiType = (typeof CALL_API_LIST)[number];

export const HISTORY_METHODS = [
  "push",
  "replace",
  "reload",
  "pushQuery",
  "replaceQuery",
] as const;

export const CONSOLE_METHODS = ["log", "info", "warn", "error"] as const;

export const EVENT_METHODS = ["preventDefault", "stopPropagation"] as const;

export type HistoryMethodType = (typeof HISTORY_METHODS)[number];

export const IdentifierUseMap = new Map<string, BindingInfo["kind"]>([
  // Used as event handlers
  ["useHistory", "history"],

  // Used as variables
  ["useQuery", "query"],
  ["useSearchParams", "searchParams"],
  ["usePathParams", "pathParams"],
  ["usePathName", "pathName"],
  ["useApp", "app"],
  ["useAuth", "auth"],
  ["useLocation", "location"],
  ["useFlags", "flags"],
  ["useMedia", "media"],
]);

export const TransformBindingMap = new Map<BindingInfo["kind"], string>([
  ["query", "QUERY"],
  ["searchParams", "PARAMS"],
  ["pathParams", "PATH"],
  ["pathName", "PATH_NAME"],
  ["app", "APP"],
  ["auth", "SYS"],
  ["location", "location"],
  ["flags", "FLAGS"],
  ["media", "MEDIA"],
]);

export const CTX_BINDING_KINDS: BindingInfo["kind"][] = [
  "state",
  "resource",
  "derived",
  "param",
];

export const SYMBOL_RENDER_USE_BRICK = Symbol("renderUseBrick");

// Native DOM events mapping (ignore single-word event names like onClick)
export const NATIVE_EVENT_MAP = new Map<string, string>([
  ["onCompositionEnd", "compositionend"],
  ["onCompositionStart", "compositionstart"],
  ["onCompositionUpdate", "compositionupdate"],

  ["onContextMenu", "contextmenu"],
  ["onDoubleClick", "dblclick"],

  ["onKeyDown", "keydown"],
  ["onKeyPress", "keypress"],
  ["onKeyUp", "keyup"],

  ["onMouseDown", "mousedown"],
  ["onMouseEnter", "mouseenter"],
  ["onMouseLeave", "mouseleave"],
  ["onMouseMove", "mousemove"],
  ["onMouseOut", "mouseout"],
  ["onMouseOver", "mouseover"],
  ["onMouseUp", "mouseup"],

  ["onPointerCancel", "pointercancel"],
  ["onPointerDown", "pointerdown"],
  ["onPointerEnter", "pointerenter"],
  ["onPointerLeave", "pointerleave"],
  ["onPointerMove", "pointermove"],
  ["onPointerOut", "pointerout"],
  ["onPointerOver", "pointerover"],
  ["onPointerUp", "pointerup"],

  // Touch events
  ["onTouchStart", "touchstart"],
  ["onTouchEnd", "touchend"],
  ["onTouchMove", "touchmove"],
  ["onTouchCancel", "touchcancel"],

  // Animation events
  ["onAnimationStart", "animationstart"],
  ["onAnimationEnd", "animationend"],
  ["onAnimationIteration", "animationiteration"],

  // Transition events
  ["onTransitionEnd", "transitionend"],
  ["onTransitionStart", "transitionstart"],
  ["onTransitionRun", "transitionrun"],
  ["onTransitionCancel", "transitioncancel"],

  // Drag events
  ["onDragStart", "dragstart"],
  ["onDragEnd", "dragend"],
  ["onDragEnter", "dragenter"],
  ["onDragLeave", "dragleave"],
  ["onDragOver", "dragover"],

  // Focus events
  ["onFocusIn", "focusin"],
  ["onFocusOut", "focusout"],
]);
