import {
  callApi,
  createPortal,
  useState,
  useEffect,
  useChangeEffect,
  showMessage,
  sessionStore,
  Routes,
  Route,
  useRef,
  callProvider,
  handleHttpError,
} from "@next-tsx/core";
import MyModal from "../Components/MyModal";
import { LayoutContext } from "../Contexts/LayoutContext";
import About from "./About";

export default function Layout() {
  const [a, setA] = useState<string | null>(null);
  const b = a ? "value" : "null";
  const [c, setC] = useState<number>(0);
  const modalRef = useRef();

  useChangeEffect(() => {
    if (a) {
      showMessage({
        type: "success",
        content: "Value of a changed: " + a + " / " + b + " / " + c,
      });

      sessionStore.setItem("myKey", { a, b, c });
    }
  }, [a, b, c]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("Layout mounted");
    return () => {
      // eslint-disable-next-line no-console
      console.log("Layout unmounted");
    };
  }, []);

  const dataSource = {
    name: "Tom",
    age: 30,
  };

  const doSomething = (thing: any) => {
    // eslint-disable-next-line no-console
    console.log("Doing something with", thing);
    thing.preventDefault();
    callProvider("oops").then(() => {
      showMessage({
        type: "info",
        content: thing.detail,
      });
    }, handleHttpError);
  };

  const handleClick = (e?: any) => {
    e.preventDefault();
    setA("New Value by callback");
    setC((prev) => prev + 42);
    modalRef.current?.open();
    modalRef.current.width = 500;
    Object.assign(modalRef.current, {
      height: "auto",
    });
    // doSomething(e);
  };

  const layoutContext = { handleClick };

  return (
    <LayoutContext.Provider value={layoutContext}>
      <button onClick={handleClick}>My App</button>
      <pre
        onClick={(e) => {
          e.preventDefault();
          // eslint-disable-next-line no-console
          console.log(e);
          // doSomething(e);
        }}
        onDoubleClick={doSomething}
      >
        {JSON.stringify(sessionStore.getItem("myKey"), null, 2)}
      </pre>
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
        onTest={(e) => {
          callApi("getUser", { id: 123 }).then((user) => {
            showMessage({
              type: "info",
              content: `Fetched user: ${user.name}, ${e.detail.reason}`,
            });
          });
        }}
      />
      <div>
        <Routes>
          <Route path="/about" component={About} />
        </Routes>
      </div>
      {createPortal(<MyModal ref={modalRef} />)}
    </LayoutContext.Provider>
  );
}
