import { useState, useReducer, useEffect, useRef } from "react";
import { useAuth } from "../../context/Contexts.jsx";
import ThemeButtonComponent from "../../components/ThemeButtonComponent/ThemeButton.component";
import EyeOffIcon from "../../assets/Icons/EyeOffIcon";
import EyeIcon from "../../assets/Icons/EyeIcon";
import "./LoginPage.css";

const initialState = {
  loading: false,
  error: null,
};

function loginReducer(state, action) {
  switch (action.type) {
    case "LOGIN_START":
      return { loading: true, error: null };
    case "LOGIN_SUCCESS":
      return { loading: false, error: null };
    case "LOGIN_ERROR":
      return { loading: false, error: action.payload };
    case "LOGOUT":
      return { ...initialState };

    default:
      return state;
  }
}

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [state, dispatch] = useReducer(loginReducer, initialState);

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = emailInputRef.current?.value;
    const password = passwordInputRef.current?.value;

    dispatch({ type: "LOGIN_START" });

    try {
      login({ email, password });
      dispatch({ type: "LOGIN_SUCCESS" });
    } catch (err) {
      dispatch({
        type: "LOGIN_ERROR",
        payload: err?.message || "Error during login, please try again.",
      });
    }
  };

  useEffect(() => {
    if (!state.error) return;
    const t = setTimeout(() => {
      dispatch({ type: "LOGIN_ERROR", payload: null });
    }, 5000);
    return () => clearTimeout(t);
  }, [state.error]);

  return (
    <div className="container">
      <div className="toggle-button">
        <ThemeButtonComponent />
      </div>

      <div>
        <h1 className="title">Local Cloud</h1>
      </div>

      <form onSubmit={handleSubmit} className="form">
        <input
          type="email"
          name="email"
          placeholder="Email"
          className="input"
          required
          autoComplete="username"
          ref={emailInputRef}
        />

        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            className="input"
            required
            autoComplete="current-password"
            ref={passwordInputRef}
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
          </button>
        </div>

        {state.error && <p className="error">{state.error}</p>}

        <button type="submit" className="button" disabled={state.loading}>
          {state.loading ? "Loading..." : "Log in"}
        </button>
      </form>
      <br />
    </div>
  );
}
