import type { ReactNode, PropsWithChildren } from "react";

export function render(app: ReactNode): ReactNode;

export function Routes(props: PropsWithChildren<{ slot?: string }>): ReactNode;

export function Route(props: {
  path: string;
  component: () => ReactNode;
}): ReactNode;

/** 返回一个有状态的值和一个更新它的函数。 */
export function useState<T>(
  initialValue?: T
): [value: T, setter: Dispatch<SetStateAction<T>>];

export type Dispatch<A> = (value: A) => void;

export type SetStateAction<S> = S | ((prevState: S) => S);

/** 异步获取资源，返回获取到的数据、以及一个重新拉取数据的函数 */
export function useResource<T = any>(
  fetcher: () => Promise<T>,
  options?: {
    // 不启用则直接返回 fallback
    enabled?: boolean;
    fallback?: unknown;
  }
): [data: T, refetch: () => void];

/**
 * 在依赖项数组变化时执行回调函数。
 *
 * 注意与 React 中的 useEffect 行为略有不同：
 * - 初始渲染时不会执行 callback，仅在 deps 变化时执行 callback
 * - 不支持返回清理函数
 */
export function useEffect(callback: () => void, deps: unknown[]): void;

/** 返回一个 ref 对象，其 `.current` 属性初始化为传入的参数 (`initialValue`) */
export function useRef<T>(initialValue: T): RefObject<T>;

export type Ref<T> = RefObject<T> | null;

export interface RefObject<T> {
  readonly current: T;
}

/**
 * 自定义暴露给父组件的实例值。
 * 在父组件中使用 `useRef` 并传递给该组件的 `ref` 属性后，可以通过该 `ref` 访问到由 `init` 创建的值。
 */
export function useImperativeHandle<T>(
  ref: Ref<T> | undefined,
  init: () => T
): void;

/** 获取当前应用的信息 */
export function useApp(): App;

export interface App {
  id: string;
  name: string;
  homepage: string;
  config: Record<string, any>;
}

/** 获取当前的特性开关配置 */
export function useFlags(): Record<string, boolean>;

/** 获取当前的媒体查询信息 */
export function useMedia(): {
  // 屏幕宽度断点名（大屏优先）
  // xLarge: >= 1920px
  // large: >= 1600px
  // medium: >= 1280px
  // small: >= 1024px
  // xSmall: < 1024px
  breakpoint: "xSmall" | "small" | "medium" | "large" | "xLarge";
};

/** 获取当前的 URL search 参数 */
export function useQuery(): {
  readonly [key: string]: string | undefined;
};

/** 获取当前的 URL path 参数 */
export function usePathParams(): {
  readonly [key: string]: string | undefined;
};

/** 获取当前的 URL path name */
export function usePathName(): string;

/** 获取用于进行导航跳转的对象 */
export function useHistory(): History;

export interface History {
  push: (url: string) => void;
  replace: (url: string) => void;
  reload: () => void;
  pushQuery: UpdateQuery;
  replaceQuery: UpdateQuery;
}

export type UpdateQuery = (
  newQuery: Record<string, string | null>,
  options?: {
    clear?: boolean; // 是否清除已有参数，默认 false
    notify?: boolean; // 是否通知路由变化，默认 true
  }
) => void;

export function useLocation(): {
  href: string;
  origin: string;
  host: string;
  hostname: string;
};

/** 获取当前用户的信息 */
export function useAuth(): {
  username: string;
  userInstanceId: string;
  isAdmin: boolean;
};

/** 接收一个 Context 对象，返回其当前的值 */
export function useContext<T>(context: Context<T>): T;

/** 创建一个 Context 来跨组件传递数据 */
export function createContext<T>(defaultValue?: T): Context<T>;

export interface Context<T> {
  /** 提供 Context 数据的组件 */
  Provider: (props: { value: T; children: React.ReactNode }) => ReactNode;
}

/** 将 children 放置在统一提供的 portal 容器中渲染 */
export function createPortal(children: any): any;

/**
 * 按 key 获取翻译后的文本。
 * 第二个参数可传递变量用于替换文本中的占位符（形如 `{{ propName }}`），
 * 也可传递默认值，当找不到对应 key 的翻译时使用该默认值。
 */
export function translate(
  key: string,
  variables?: Record<string, unknown>
): string;

/**
 * 按 key 获取翻译后的文本。
 * 第二个参数可传递变量用于替换文本中的占位符（形如 `{{ propName }}`），
 * 也可传递默认值，当找不到对应 key 的翻译时使用该默认值。
 */
export function translate(key: string, defaultValue?: string): string;

export function translateByRecord(record: Record<string, string>): string;

/** 根据错误对象显示错误信息弹窗 */
export function handleHttpError(error: any): void;

/** 调用指定的 Provider 接口 */
export function callApi<T extends keyof ContractMap>(
  api: T,
  params: Parameters<ContractMap[T]>[0]
): Promise<ReturnType<ContractMap[T]>>;

/** 调用指定的 HTTP 接口 */
export function callHttp<T = any>(url: string, init?: RequestInit): Promise<T>;

/** 调用指定的工具函数 */
export function callTool<T = any, P = any>(
  conversationId: string,
  stepId: string,
  params: P
): Promise<T>;

/** 提示用户操作结果 */
export function showMessage(options: {
  type: "success" | "error" | "warn" | "info";
  content: string;
}): void;

/** 弹出对话框 */
export function showDialog(options: {
  type?: "success" | "error" | "warn" | "info" | "confirm" | "delete";
  title?: string;
  content: string;
  danger?: boolean;
  /**
   * 配合 type: delete 使用，用户需要输入期望值才能进行操作。
   * 在 content 中可以使用 `{{ expect }}` 占位符来显示期望值。
   */
  expect?: string;
}): Promise<void>;

/** 拷贝一段文本 */
export function copyText(text: string): Promise<void>;

/**
 * 本地存储对象，数据存储在浏览器的 Local Storage 中，生命周期为永久。
 * 可存储任意能被 JSON 序列化的数据。
 */
export const localStore: Store;

/**
 * 会话存储对象，数据存储在浏览器的 Session Storage 中，生命周期为当前会话。
 * 可存储任意能被 JSON 序列化的数据。
 */
export const sessionStore: Store;

export interface Store {
  getItem<T = any>(key: string): T | null;
  setItem<T = any>(key: string, value: T): void;
  removeItem(key: string): void;
}

/**
 * 平台部署的基础路径，通常为 `/next/`。
 *
 * 对于大部分组件，设置 url 时不需要带上该前缀，但在某些需要使用完整 URL 的场景下需要使用该常量进行拼接。
 */
export const BASE_URL: string;

declare module "react" {
  interface DOMAttributes {
    onMount?: () => void;
    onUnmount?: () => void;
  }
}
