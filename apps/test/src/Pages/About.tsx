import {
  callApi,
  createContext,
  handleHttpError,
  querySelector,
  translate,
  useContext,
  useRef,
  useResource,
  useSearchParams,
  useMenu,
} from "@next-tsx/core";
import { LayoutContext } from "@/Contexts/LayoutContext";
import { /* testA, */ XYZ } from "./Layout";

const AboutContext = createContext();

export default function About() {
  const { handleClick } = useContext(LayoutContext);
  const params = useSearchParams();
  const [aboutInfo, refetch] = useResource(
    () =>
      callApi("easyops.api.llm.elevo_object@ListServiceObjects:1.0.0", {
        id: params.get("id"),
      }),
    { async: true, fallback: null }
  );
  const modalRef = useRef();

  const menu = useMenu("my-static-menu");

  return (
    <AboutContext.Provider value={{ aboutInfo, refetch }}>
      <div
        menu={menu}
        onMount={handleClick}
        onClick={() => {
          refetch().then(() => {
            // eslint-disable-next-line no-console
            console.log("ok");
          }, handleHttpError);

          querySelector("#my-modal")
            ?.open()
            .then(
              () => {
                // eslint-disable-next-line no-console
                console.log("opened");
              },
              () => {
                // eslint-disable-next-line no-console
                console.log("failed to open", XYZ, testA());
              }
            )
            .catch(handleHttpError)
            .finally(() => {
              // eslint-disable-next-line no-console
              console.log("finally");
            });

          Object.assign(querySelector("#my-modal"), {
            width: 600,
            height: "auto",
          });

          querySelector("#my-modal").title = "About Modal";

          Object.assign(modalRef.current, {
            width: 600,
            height: "auto",
          });

          modalRef.current.title = "About Modal";
        }}
      >
        {translate("ABOUT")} {params.get("id")} {aboutInfo}
      </div>
      <div>{aboutInfo ? <span slot="a">1</span> : <span slot="b">2</span>}</div>
      <eo-modal ref={modalRef} />
    </AboutContext.Provider>
  );
}
