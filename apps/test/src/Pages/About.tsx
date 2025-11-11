import { useContext } from "@next-tsx/core";
import { LayoutContext } from "../Contexts/LayoutContext";

export default function About() {
  const { handleClick } = useContext(LayoutContext);

  return <div onMount={handleClick}>About</div>;
}
