import ThemeButtonComponent from "../ThemeButtonComponent/ThemeButton.component.jsx";
import PaletteIcon from "../../assets/Icons/PaletteIcon";
import { useAuth } from "../../context/Contexts.jsx";
import "./ProfileDropdown.component.css";

export default function ProfileDropdownContent({ user, onThemeSettings }) {
  const { logout } = useAuth();

  return (
    <div className="profile-dropdown-container">
      {(user?.username || user?.email) && (
        <div className="profile-dropdown-user">
          <span className="profile-dropdown-username">{user.username || user.email}</span>
        </div>
      )}

      <div className="dropdown-mobile-only">
        <div className="profile-dropdown-theme-row">
          <ThemeButtonComponent />
          <span className="profile-dropdown-theme-label">Theme</span>
        </div>
        <button type="button" className="profile-dropdown-action-btn" onClick={onThemeSettings}>
          <span className="dropdown-item-icon"><PaletteIcon size={18} /></span>
          Theme colors
        </button>
        <div className="profile-dropdown-divider" />
      </div>

      <ul>
        <li>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </li>
      </ul>
    </div>
  );
}
