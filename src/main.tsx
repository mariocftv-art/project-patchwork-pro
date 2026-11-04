import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// App instalável: registra o service worker, exceto no link de assinatura do cliente
// (lá o celular não deve baixar o site inteiro em segundo plano antes de mostrar o contrato).
if (import.meta.env.PROD && "serviceWorker" in navigator && !/^\/(assinar|contrato)\//.test(location.pathname)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  });
}
