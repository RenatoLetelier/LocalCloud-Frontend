import { useState, useEffect } from "react";
import { useAuth } from "../../context/Contexts.jsx";
import InputComponent from "../InputComponent/Input.component.jsx";
import "./Form.component.css";

// ── Validation rules ──────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validators = {
  email: (v) => {
    if (!v.trim())              return "Email is required.";
    if (!EMAIL_RE.test(v.trim())) return "Enter a valid email address.";
    return null;
  },
  password: (v) => {
    if (!v)          return "Password is required.";
    if (v.length < 6) return "Password must be at least 6 characters.";
    return null;
  },
};

// ── Form component ────────────────────────────────────────────────────────────

export default function FormComponent({
  enableUsername = true,
  enableEmail    = true,
  enablePassword = true,
}) {
  const { login } = useAuth();

  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [touched,     setTouched]     = useState({});   // tracks which fields have been blurred
  const [loading,     setLoading]     = useState(false);
  const [serverError, setServerError] = useState(null);

  // Compute per-field errors (only shown after the field has been touched)
  const emailErr    = enableEmail    && touched.email    ? validators.email(email)       : null;
  const passwordErr = enablePassword && touched.password ? validators.password(password) : null;

  // Form is valid when all enabled fields pass their validator
  const isValid = (
    (!enableEmail    || !validators.email(email))    &&
    (!enablePassword || !validators.password(password))
  );

  const blur = (field) => setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Touch all fields to surface any hidden errors
    setTouched({ email: true, password: true });
    if (!isValid) return;

    setLoading(true);
    setServerError(null);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setServerError(err?.message ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-clear server error after 5 s
  useEffect(() => {
    if (!serverError) return;
    const t = setTimeout(() => setServerError(null), 5000);
    return () => clearTimeout(t);
  }, [serverError]);

  return (
    <form onSubmit={handleSubmit} className="form" noValidate>
      {/* Username — hidden on LoginPage, shown if a future sign-up page enables it */}
      {enableUsername && (
        <InputComponent
          typeInput="text"
          isShowed={enableUsername}
          placeholder="Username"
        />
      )}

      {enableEmail && (
        <InputComponent
          typeInput="email"
          isShowed={enableEmail}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => blur("email")}
          error={emailErr}
        />
      )}

      {enablePassword && (
        <InputComponent
          typeInput="password"
          isShowed={enablePassword}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => blur("password")}
          error={passwordErr}
        />
      )}

      {serverError && <p className="error-message">{serverError}</p>}

      <button
        type="submit"
        className="submit-button"
        disabled={loading}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
