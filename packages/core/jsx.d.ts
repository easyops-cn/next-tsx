import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "eo-viewport": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        minimumScale?: number;
        maximumScale?: number;
        userScalable?: "yes" | "no";
      };
      "ai-portal--elevo-sidebar": any;
      "ai-portal--notice-dropdown": any;
    }
  }
}
