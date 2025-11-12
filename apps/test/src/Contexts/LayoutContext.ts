import { createContext } from "@next-tsx/core";

export interface LayoutContextType {
  handleClick: () => void;
}

export const LayoutContext = createContext<LayoutContextType>();
