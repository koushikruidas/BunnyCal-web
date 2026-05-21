import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/globals.css";
import { App } from "./App";
if (window.location.hostname === "127.0.0.1") {
    const canonical = new URL(window.location.href);
    canonical.hostname = "localhost";
    window.location.replace(canonical.toString());
}
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(BrowserRouter, { children: _jsx(App, {}) }) }));
