import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { startAppWorker } from "./lib/appWorker";

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
void startAppWorker().catch(() => undefined);
