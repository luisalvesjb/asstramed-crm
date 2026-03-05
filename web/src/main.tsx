import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import { Provider } from "react-redux";
import { App } from "./app/App";
import { AuthProvider } from "./context/AuthContext";
import { store } from "./store";
import { asstramedAntTheme } from "./ui/theme/antTheme";
import "antd/dist/reset.css";
import "./ui/theme/ant-overrides.css";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ConfigProvider theme={asstramedAntTheme}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </ConfigProvider>
    </Provider>
  </React.StrictMode>
);
