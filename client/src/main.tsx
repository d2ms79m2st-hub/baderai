import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// The public GitHub Pages app is intentionally standalone. Chat traffic is
// sent directly from n8nAssistant.ts to the two n8n webhooks; no Manus OAuth,
// tRPC client, or /api/trpc runtime is initialized in the browser.
createRoot(document.getElementById("root")!).render(<App />);
