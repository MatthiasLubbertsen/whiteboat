import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import * as Sentry from "@sentry/browser"

import "./index.css"
import App from "./App.tsx"

Sentry.init({ dsn: "https://c0af63c0e2204fd1b9517833e8796ebc@app.glitchtip.com/14238" });

document.addEventListener("contextmenu", (event) => event.preventDefault())

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
