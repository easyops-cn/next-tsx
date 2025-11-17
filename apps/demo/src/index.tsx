import { render, Routes, Route } from "@next-tsx/core";
import Layout from "./Pages/Layout";

render(
  <Routes>
    <Route path="/" component={Layout} />
  </Routes>
);
