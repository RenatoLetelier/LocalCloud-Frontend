import { useState, useReducer, useEffect } from "react";
import { useAuth } from "../../context/Contexts.jsx";
import ThemeButtonComponent from "../../components/ThemeButtonComponent/ThemeButton.component";
import EyeOffIcon from "../../assets/Icons/EyeOffIcon";
import EyeIcon from "../../assets/Icons/EyeIcon";
import "./LoginPage.css";

const initialState = {
  email: "",
  password: "",
  user: null,
  loading: false,
  error: null,
};

const loginReducer = (state, action) => {
  switch (action.type) {
    case "UPDATE_FIELD":
      return { ...state, [action.field]: action.value, error: null };
    case "LOGIN_START":
      return { ...state, loading: true, error: null };
    case "LOGIN_SUCCESS":
      return { ...state, loading: false, user: action.payload };
    case "LOGIN_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "LOGOUT":
      return { ...initialState };
    default:
      return state;
  }
};

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [state, dispatch] = useReducer(loginReducer, initialState);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch({ type: "LOGIN_START" });

    try {
      const result = await login({
        email: state.email,
        password: state.password,
      });

      const user = result?.user ?? { email: state.email };

      dispatch({ type: "LOGIN_SUCCESS", payload: user });
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
          value={state.email}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_FIELD",
              field: "email",
              value: e.target.value,
            })
          }
          className="input"
          required
          autoComplete="username"
        />

        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={state.password}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_FIELD",
                field: "password",
                value: e.target.value,
              })
            }
            className="input"
            required
            autoComplete="current-password"
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
