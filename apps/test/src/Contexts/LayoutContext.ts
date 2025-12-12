import { createContext } from "@next-tsx/core";

export interface LayoutContextType {
  handleClick: () => void;
  serviceNodes: any[];
}

export const LayoutContext = createContext<LayoutContextType>();
