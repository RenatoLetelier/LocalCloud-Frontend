import { useState, forwardRef } from "react";
import EyeOffIcon from "../../assets/Icons/EyeOffIcon";
import EyeIcon from "../../assets/Icons/EyeIcon";
import "./Input.component.css";

export default forwardRef(function InputComponent(
  { typeInput = "text", isShowed = true, placeholder = "placeholder..." },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  if (!isShowed) return null;

  return typeInput === "password" ? (
    <div className="password-input-wrapper">
      <input
        type={showPassword ? "text" : "password"}
        name="password"
        placeholder={placeholder}
        className="input"
        ref={ref}
      />
      <button
        type="button"
        className="toggle-show-password"
        onClick={() => setShowPassword((s) => !s)}
      >
        {showPassword ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
      </button>
    </div>
  ) : (
    <input
      type={typeInput}
      name={typeInput}
      placeholder={placeholder}
      className="input"
      ref={ref}
    />
  );
});
