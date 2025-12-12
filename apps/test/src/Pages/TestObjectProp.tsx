import { useContext } from "@next-tsx/core";
import { LayoutContext } from "@/Contexts/LayoutContext";

export default function TestObjectProp() {
  const { serviceNodes } = useContext(LayoutContext);

  return (
    <div>
      <eo-table dataSource={{ list: serviceNodes }} />
    </div>
  );
}
