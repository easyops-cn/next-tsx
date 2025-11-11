import { createPortal, useState } from "@next-tsx/core";
import MyModal from "../Components/MyModal";

export default function Layout() {
  const [a, _setA] = useState<string | null>(null);

  return (
    <>
      <div title={a!.length > 0 ? (a as string) : "default"}>
        <h1>My App</h1>
      </div>
      {createPortal(<MyModal />)}
    </>
  );
}
