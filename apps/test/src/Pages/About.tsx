import {
  callApi,
  createContext,
  handleHttpError,
  querySelector,
  useContext,
  useRef,
  useResource,
  useSearchParams,
} from "@next-tsx/core";
import { LayoutContext } from "../Contexts/LayoutContext";

const AboutContext = createContext();

export default function About() {
  const { handleClick } = useContext(LayoutContext);
  const params = useSearchParams();
  const [aboutInfo, refetch] = useResource(
    () => callApi("my.api@getAboutInfo:1.0.0", { id: params.get("id") }),
    { async: true, fallback: null }
  );
  const modalRef = useRef();

  return (
    <AboutContext.Provider value={{ aboutInfo, refetch }}>
      <div
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
                console.log("failed to open");
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
        About {params.get("id")} {aboutInfo}
      </div>
      <div>{aboutInfo ? <span slot="a">1</span> : <span slot="b">2</span>}</div>
      <eo-modal ref={modalRef} />
    </AboutContext.Provider>
  );
}
