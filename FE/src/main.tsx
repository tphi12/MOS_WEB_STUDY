import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { App } from "./App";
import "./styles.css";

const canUseBrowserHistory =
  typeof window.history?.pushState === "function" &&
  typeof window.history?.replaceState === "function";

const Router = canUseBrowserHistory ? BrowserRouter : MemoryRouter;
const routerProps = canUseBrowserHistory
  ? {}
  : { initialEntries: [window.location.pathname || "/tests"] };

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router {...routerProps}>
      <App />
    </Router>
  </StrictMode>,
);
