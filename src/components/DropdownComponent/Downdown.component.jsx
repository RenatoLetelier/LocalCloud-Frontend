import { useRef, useEffect, useLayoutEffect } from "react";
import "./Dropdown.component.css";

export default function Dropdown({ isOpen, anchorRef, onClose, children }) {
  const dropdownRef = useRef(null);

  // Cerrar por click fuera
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      const anchor = anchorRef?.current;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        anchor &&
        !anchor.contains(e.target)
      ) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, anchorRef, onClose]);

  // Medición y posicionamiento -> escribe variables CSS
  useLayoutEffect(() => {
    if (!isOpen) return;
    const anchor = anchorRef?.current;
    const dropdown = dropdownRef.current;
    if (!anchor || !dropdown) return;

    const setVars = (vars) => {
      for (const [k, v] of Object.entries(vars)) {
        dropdown.style.setProperty(k, v);
      }
    };

    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect();
      setVars({
        "--top": `${rect.bottom}px`,
        "--right": `${window.innerWidth - rect.right}px`,
        "--minWidth": `${rect.width}px`,
      });
    };

    updatePosition();

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    const ro = new ResizeObserver(updatePosition);
    ro.observe(anchor);

    const raf1 = requestAnimationFrame(updatePosition);
    const raf2 = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      ro.disconnect();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [isOpen, anchorRef]);

  if (!isOpen) return null;

  return (
    <div className="dropdown-container" ref={dropdownRef}>
      {children}
    </div>
  );
}
