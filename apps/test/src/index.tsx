import {
  render,
  Routes,
  Route,
  translate,
  callProvider,
  createMenu,
} from "@next-tsx/core";
import Layout from "@/Pages/Layout";

render(
  <Routes>
    <Route path="/" component={Layout} />
  </Routes>
);

// Static menu
createMenu(
  "my-static-menu",
  {
    title: translate("MY_MENU", "My Menu"),
  },
  [
    {
      text: translate("SUB_MENU_1", "Sub Menu 1"),
    },
  ]
);

createMenu(
  "my-dynamic-menu",
  {
    title: translate("MY_ANOTHER_MENU", "My Another Menu"),
  },
  () => callProvider("my-provider", "my-first-argument").then((res) => res.list)
);
