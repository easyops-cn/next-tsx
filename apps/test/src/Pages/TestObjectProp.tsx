import { useContext } from "@next-tsx/core";
import { LayoutContext } from "@/Contexts/LayoutContext";

export default function TestObjectProp() {
  const { serviceNodes } = useContext(LayoutContext);

  return (
    <div className="test-object-prop" style={{ padding: "20px" }}>
      <eo-table dataSource={{ list: serviceNodes }} />
    </div>
  );
}
