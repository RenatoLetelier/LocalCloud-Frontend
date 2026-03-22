import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { initThemeConfig } from "./components/ThemeSettingsComponent/ThemeSettings.component.jsx";

// Apply any saved accent-color config before first paint
initThemeConfig();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
