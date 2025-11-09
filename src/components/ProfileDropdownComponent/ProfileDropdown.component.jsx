import "./ProfileDropdown.component.css";

export default function ProfileDropdownContent() {
  const handleLogout = () => {
    localStorage.removeItem("token");
  };

  return (
    <div className="profile-dropdown-container">
      <ul>
        <a href="/profile">
          <li>Profile</li>
        </a>
        <a href="/settings">
          <li>Settings</li>
        </a>
        <a href="/login">
          <li onClick={handleLogout}>Log out</li>
        </a>
      </ul>
    </div>
  );
}
