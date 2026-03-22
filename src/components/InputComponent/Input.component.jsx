import { useState, forwardRef } from "react";
import EyeOffIcon from "../../assets/Icons/EyeOffIcon";
import EyeIcon    from "../../assets/Icons/EyeIcon";
import "./Input.component.css";

/**
 * InputComponent
 *
 * Supports both uncontrolled (ref) and controlled (value + onChange) modes.
 * Pass `error` to show a validation message beneath the field.
 */
export default forwardRef(function InputComponent(
  {
    typeInput   = "text",
    isShowed    = true,
    placeholder = "placeholder…",
    value,
    onChange,
    onBlur,
    error,
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);

  if (!isShowed) return null;

  const inputClass = `input${error ? " input--error" : ""}`;

  const sharedProps = {
    placeholder,
    className: inputClass,
    ref,
    ...(value     !== undefined && { value }),
    ...(onChange  !== undefined && { onChange }),
    ...(onBlur    !== undefined && { onBlur }),
  };

  return (
    <div className="input-wrapper">
      {typeInput === "password" ? (
        <div className="password-input-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            {...sharedProps}
          />
          <button
            type="button"
            className="toggle-show-password"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
          </button>
        </div>
      ) : (
        <input
          type={typeInput}
          name={typeInput}
          autoComplete={typeInput === "email" ? "email" : typeInput}
          {...sharedProps}
        />
      )}

      {error && <p className="input-error-msg" role="alert">{error}</p>}
    </div>
  );
});
