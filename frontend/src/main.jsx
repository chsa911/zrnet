// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AppProvider } from "./context/AppContext"; // keep if you have it
import { I18nProvider } from "./context/I18nContext"; // <-- add this
import "./index.css";
import "./styles/css/zr-ui.css";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);