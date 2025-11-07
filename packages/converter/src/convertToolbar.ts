import type { BrickConf } from "@next-core/types";
import type { Component } from "@next-tsx/parser";

export default function convertToolbar(_component: Component): BrickConf {
  return {
    brick: "eo-flex-layout",
    properties: {
      gap: "0.5em",
      alignItems: "center",
    },
  };
}
