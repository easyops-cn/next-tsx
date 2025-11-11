import { createPortal, useState, useEffect, showMessage } from "@next-tsx/core";
import MyModal from "../Components/MyModal";

export default function Layout() {
  const [a, setA] = useState<string | null>(null);
  const b = a ? "value" : "null";
  const [c, setC] = useState<number>(0);

  useEffect(() => {
    if (a) {
      showMessage({
        type: "success",
        content: "Value of a changed: " + a + " / " + b + " / " + c,
      });
    }
  }, [a, b, c]);

  return (
    <>
      <button
        onClick={() => {
          setA("New Value");
          setC((prev) => prev + 42);
        }}
      >
        My App
      </button>
      {createPortal(<MyModal />)}
    </>
  );
}
