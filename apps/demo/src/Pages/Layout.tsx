import { showMessage } from "@next-tsx/core";

export default function Layout() {
  const handleDoubleClick = (e: any) => {
    e.preventDefault();
    // eslint-disable-next-line no-console
    console.log("Button clicked!", e);
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
