import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import "./styles/globals.css";
import { App } from "./App";
import { hydrateAccessTokenFromStorage } from "./lib/apiClient";
import { queryClient } from "./lib/queryClient";

if (window.location.hostname === "127.0.0.1") {
  const canonical = new URL(window.location.href);
  canonical.hostname = "localhost";
  window.location.replace(canonical.toString());
}

hydrateAccessTokenFromStorage();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
