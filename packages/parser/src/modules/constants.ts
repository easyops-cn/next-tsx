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

export type HistoryMethodType = (typeof HISTORY_METHODS)[number];

export const IdentifierUseMap = new Map<string, BindingInfo["kind"]>([
  // Used as event handlers
  ["useHistory", "history"],

  // Used as variables
  ["useQuery", "query"],
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
  ["pathParams", "PATH"],
  ["pathName", "PATH_NAME"],
  ["app", "APP"],
  ["auth", "SYS"],
  ["location", "location"],
  ["flags", "FLAGS"],
  ["media", "MEDIA"],
]);
