import {
  callApi,
  handleHttpError,
  useContext,
  useRef,
  useResource,
  useSearchParams,
} from "@next-tsx/core";
import { LayoutContext } from "../Contexts/LayoutContext";

export default function About() {
  const { handleClick } = useContext(LayoutContext);
  const params = useSearchParams();
  const [res, refetch] = useResource(
    () => callApi("my.api@getAboutInfo:1.0.0", { id: params.get("id") }),
    { async: true, fallback: null }
  );
  const modalRef = useRef();

  return (
    <>
      <div
        onMount={handleClick}
        onClick={() => {
          refetch().then(
            () => {
              // eslint-disable-next-line no-console
              console.log("ok");
            },
            (err) => handleHttpError(err)
          );
        }}
      >
        About {params.get("id")} {res}
      </div>
      <div>{res ? <span slot="a">1</span> : <span slot="b">2</span>}</div>
      <eo-modal ref={modalRef} />
    </>
  );
}
