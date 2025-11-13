import type { ComponentChild } from "./interfaces";
import type { ChildElement } from "./internal-interfaces";

/**
 * Unwinds control flow components (If/ForEach) when children have multiple slots.
 * Creates separate control components for each slot to properly handle slot-based rendering.
 *
 * @param name - The control component type ("If" or "ForEach")
 * @param dataSource - The condition or data source for the control component
 * @param defaultChildren - Children to render in the default/true case
 * @param elseChildren - Children to render in the else/false case (optional)
 * @returns Array of control components, one per unique slot name
 */
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

/**
 * Groups children by their slot names.
 * Children without a slot are grouped under an empty string key.
 *
 * @param children - Array of component children to group
 * @returns Map of slot names to arrays of children
 */
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
