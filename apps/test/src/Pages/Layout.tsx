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
  translate,
} from "@next-tsx/core";
import MyModal from "@/Components/MyModal";
import { LayoutContext } from "@/Contexts/LayoutContext";
import LogoutSvg from "@/Images/logout.svg";
import About from "./About";
import TestHooks from "./TestHooks";
import TestObjectProp from "./TestObjectProp";
import Config from "./Config"; // 测试目录导入：./Config/index.tsx
import style from "./Layout.css";
import img from "../Images/test.png";

const ABC = 42;
export const XYZ = ABC * 2 + testB("C");

export function testA() {
  return testB("A" + XYZ);
}

function testB(a: string) {
  return a + "B";
}

function Temp() {
  return <div>Temp Component</div>;
}

export default function Layout() {
  const [a, setA] = useState<string | null>(null);
  const b = a ? "value" : "null";
  const [c, setC] = useState<number>(0);
  const [serviceNodes, _setServiceNodes] = useState([{ id: 1 }, { id: 2 }]);
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
    const a = "b";
    // eslint-disable-next-line no-console
    console.log("Layout mounted", a, ABC, XYZ, testA());
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
    callApi("easyops.api.llm.elevo_object@GetServiceObjectDetail", {});
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
    window.open(e.detail?.url);
  };

  const layoutContext = { handleClick, serviceNodes };

  return (
    <LayoutContext.Provider value={layoutContext}>
      <style>{style}</style>
      <button onClick={handleClick}>{translate("MY_APP")}</button>
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
      <div className="conditional-text">
        {a === "connectors" && translate("MY_APP")}
        {a === "personal-info" && translate("MY_APP")}
      </div>
      <img src={LogoutSvg} alt="Logout" />
      <div className="text-inline-img">测试css内联图片</div>
      <div style={{ backgroundImage: `url(${img})` }}>测试图片~</div>
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
          <Route path="/test-hooks" component={TestHooks} />
          <Route path="/test-object-prop" component={TestObjectProp} />
          <Route path="/config" component={Config} />
        </Routes>
      </div>
      <Temp />
      {createPortal(<MyModal ref={modalRef} />)}
    </LayoutContext.Provider>
  );
}
