import { useRef, useState } from "react";
import ProfileIcon from "../../assets/Icons/ProfileIcon";
import ThemeButtonComponent from "../ThemeButtonComponent/ThemeButton.component.jsx";
import ArrowDownIcon from "../../assets/Icons/ArrowDown.jsx";
import Dropdown from "../DropdownComponent/Downdown.component.jsx";
import ProfileDropdownContent from "../ProfileDropdownComponent/ProfileDropdown.component.jsx";
import "./Header.component.css";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const profileRef = useRef(null);

  const handleOpen = () => setIsOpen(!isOpen);

  return (
    <header className="header-container">
      <a href="/" className="title">
        Local Cloud
      </a>
      <div className="settings-section">
        <ThemeButtonComponent />
        <div className="profile-section" ref={profileRef} onClick={handleOpen}>
          <ArrowDownIcon size={20} />
          <ProfileIcon />
        </div>
        <Dropdown
          isOpen={isOpen}
          anchorRef={profileRef}
          onClose={() => setIsOpen(false)}
        >
          <ProfileDropdownContent />
        </Dropdown>
      </div>
    </header>
  );
}
