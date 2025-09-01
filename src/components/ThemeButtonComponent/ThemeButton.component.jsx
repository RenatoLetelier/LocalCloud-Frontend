import { useEffect, useState } from "react";
import SunIcon from "../../assets/Icons/SunIcon";
import MoonIcon from "../../assets/Icons/MoonIcon";
import "./ThemeButton.component.css";

const STORAGE_KEY = "theme";

function getSystemPref() {
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function getCurrentTheme() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return getSystemPref();
}

export default function ThemeButtonComponent() {
  const [theme, setTheme] = useState(getCurrentTheme());

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      const hasOverride = document.documentElement.hasAttribute("data-theme");
      if (!hasOverride) setTheme(getSystemPref());
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Do nothing
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <button className="theme-toggle" onClick={toggle}>
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
