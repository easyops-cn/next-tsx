import {
  render,
  Routes,
  Route /* , translate, callProvider  */,
} from "@next-tsx/core";
import Layout from "@/Pages/Layout";

render(
  <Routes>
    <Route path="/" component={Layout} />
  </Routes>
);

// createMenu("my-menu", {
//   title: translate("MY_MENU", "My Menu"),
//   // Static items
//   items: [],
// });

// createMenu("my-another-menu", {
//   title: translate("MY_ANOTHER_MENU", "My Another Menu"),
//   // Dynamic items from provider
//   items: () =>
//     callProvider("my-provider", "my-first-argument").then((res) => res.list),
// });

// function createMenu(id: string, config: any) {
//   return {
//     ...config,
//     menuId: id,
//   };
// }
