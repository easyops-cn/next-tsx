import { showMessage } from "@next-tsx/core";

export default function Layout() {
  const handleDoubleClick = (e: any) => {
    const detail = e.detail;
    if (e.type === "x") {
      const d = detail.x;
      e.preventDefault();
      // eslint-disable-next-line no-console
      console.log("X clicked!", d);
    } else if (e.type === "y") {
      const e = detail.y;
      // e.stopPropagation();
      // eslint-disable-next-line no-console
      console.log("Y clicked!", e.y);
    }
  };

  return (
    <div
      onClick={() => {
        showMessage({ type: "info", content: "ok" });
      }}
    >
      <p>Demo Page</p>
      <button onDoubleClick={handleDoubleClick}>Demo Layout</button>
    </div>
  );
}
