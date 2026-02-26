import { Link } from "react-router-dom";
import { useAuth } from "../../context/Contexts.jsx";
import "./ProfileDropdown.component.css";

export default function ProfileDropdownContent() {
  const { logout } = useAuth();

  return (
    <div className="profile-dropdown-container">
      <ul>
        <li>
          <Link to="/profile">Profile</Link>
        </li>
        <li>
          <Link to="/settings">Settings</Link>
        </li>
        <li>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </li>
      </ul>
    </div>
  );
}
