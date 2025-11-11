/* eslint-disable */
// @ts-nocheck

import { createContext } from "@next-tsx/core";
import type { Dispatch, SetStateAction } from "@next-tsx/core";

export interface LayoutContextType {
  handleClick: () => void;
}

export const LayoutContext = createContext<LayoutContextType>();
