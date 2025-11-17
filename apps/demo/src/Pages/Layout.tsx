import { showMessage } from "@next-tsx/core";

export default function Layout() {
  const handleDoubleClick = (e: any) => {
    const detail = e.detail;
    const d = detail.x;
    e.preventDefault();
    // eslint-disable-next-line no-console
    console.log("Button clicked!", d);
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
