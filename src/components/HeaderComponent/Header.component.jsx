import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ProfileIcon from "../../assets/Icons/ProfileIcon";
import PaletteIcon from "../../assets/Icons/PaletteIcon";
import ThemeButtonComponent from "../ThemeButtonComponent/ThemeButton.component.jsx";
import ArrowDownIcon from "../../assets/Icons/ArrowDown.jsx";
import Dropdown from "../DropdownComponent/Downdown.component.jsx";
import ProfileDropdownContent from "../ProfileDropdownComponent/ProfileDropdown.component.jsx";
import ThemeSettings from "../ThemeSettingsComponent/ThemeSettings.component.jsx";
import { useAuth } from "../../context/Contexts.jsx";
import "./Header.component.css";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);
  const profileRef = useRef(null);
  const paletteRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { pathname } = useLocation();
  const pathSection = pathname.split("/")[1];

  return (
    <header className="header-container">
      <h1 className="title" onClick={() => navigate("/")}>
        Local Cloud <span className="section">{pathSection}</span>
      </h1>

      <div className="settings-section">
        <ThemeButtonComponent />

        <button
          ref={paletteRef}
          className={`header-icon-btn${themeSettingsOpen ? " active" : ""}`}
          onClick={() => setThemeSettingsOpen((o) => !o)}
          title="Theme colors"
          aria-label="Theme colors"
        >
          <PaletteIcon size={18} />
        </button>

        <div className="profile-section" ref={profileRef} onClick={() => setIsOpen((o) => !o)}>
          {(user?.username || user?.email) && (
            <span className="header-username">{user.username || user.email}</span>
          )}
          <ArrowDownIcon size={18} />
          <ProfileIcon size={26} />
        </div>

        <Dropdown
          isOpen={isOpen}
          anchorRef={profileRef}
          onClose={() => setIsOpen(false)}
        >
          <ProfileDropdownContent />
        </Dropdown>

        <ThemeSettings
          isOpen={themeSettingsOpen}
          anchorRef={paletteRef}
          onClose={() => setThemeSettingsOpen(false)}
        />
      </div>
    </header>
  );
}
