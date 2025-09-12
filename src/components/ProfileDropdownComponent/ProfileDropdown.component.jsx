export default function ProfileDropdownContent() {
  const handleLogout = () => {
    localStorage.removeItem("token");
  };

  return (
    <div>
      <ul>
        <li onClick={handleLogout}>
          <a href="/login">Log out</a>
        </li>
      </ul>
    </div>
  );
}
