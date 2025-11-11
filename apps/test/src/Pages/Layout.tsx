import {
  createPortal,
  useState,
  useEffect,
  showMessage,
  sessionStore,
} from "@next-tsx/core";
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

      sessionStore.setItem("myKey", { a, b, c });
    }
  }, [a, b, c]);

  const dataSource = {
    name: "Tom",
    age: 30,
  };

  const handleClick = () => {
    setA("New Value by callback");
    setC((prev) => prev + 42);
  };

  return (
    <>
      <button onClick={handleClick}>My App</button>
      <pre>{JSON.stringify(sessionStore.getItem("myKey"), null, 2)}</pre>
      <eo-descriptions
        dataSource={dataSource}
        list={[
          {
            label: "Name",
            render: (d) => <strong>{d.name}</strong>,
          },
          {
            label: "Age",
            render: (d) => <em>{d.age}</em>,
          },
        ]}
      />
      {createPortal(<MyModal />)}
    </>
  );
}
