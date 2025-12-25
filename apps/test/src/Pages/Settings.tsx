import { Routes, Route, translate } from "@next-tsx/core";
import SettingsProfile from "./Settings/Profile";
import SettingsSecurity from "./Settings/Security";

export default function Settings() {
  return (
    <Routes
      menu={{
        breadcrumb: {
          items: [
            { text: translate("HOME", "首页"), to: "/" },
            { text: "设置" },
          ],
        },
      }}
    >
      <Route
        path="/profile"
        component={SettingsProfile}
        menu={{
          pageTitle: "个人资料",
          breadcrumb: {
            items: [{ text: "个人资料" }],
          },
        }}
      />
      <Route
        path="/security"
        component={SettingsSecurity}
        menu={{
          pageTitle: "安全设置",
          breadcrumb: {
            items: [{ text: "安全设置" }],
          },
        }}
      />
    </Routes>
  );
}
