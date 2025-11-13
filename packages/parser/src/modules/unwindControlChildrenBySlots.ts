import type { ComponentChild } from "./interfaces";
import type { ChildElement } from "./internal-interfaces";

export function unwindControlChildrenBySlots(
  name: "If" | "ForEach",
  dataSource: unknown,
  defaultChildren: ComponentChild[] | undefined,
  elseChildren?: ComponentChild[]
): ChildElement[] {
  const defaultChildrenMap = groupChildrenBySlots(defaultChildren);
  const elseChildrenMap = groupChildrenBySlots(elseChildren);

  const allSlotNames = new Set<string>();
  for (const slotName of defaultChildrenMap.keys()) {
    allSlotNames.add(slotName);
  }
  for (const slotName of elseChildrenMap.keys()) {
    allSlotNames.add(slotName);
  }

  const result: ChildElement[] = [];
  for (const slotName of allSlotNames) {
    const slotDefaultChildren = defaultChildrenMap.get(slotName) || [];
    const slotElseChildren = elseChildrenMap.get(slotName) || [];

    result.push({
      type: "component",
      component: {
        name,
        properties: { dataSource },
        slot: slotName,
        children: [
          ...slotDefaultChildren.map((component) => ({
            ...component,
            slot: "",
          })),
          ...slotElseChildren.map((component) => ({
            ...component,
            slot: "else",
          })),
        ],
      },
    });
  }

  return result;
}

function groupChildrenBySlots(children?: ComponentChild[]) {
  const slotMap = new Map<string, ComponentChild[]>();
  for (const child of children ?? []) {
    const slotName = child.slot || "";
    let list = slotMap.get(slotName);
    if (!list) {
      list = [];
      slotMap.set(slotName, list);
    }
    list.push(child);
  }
  return slotMap;
}
