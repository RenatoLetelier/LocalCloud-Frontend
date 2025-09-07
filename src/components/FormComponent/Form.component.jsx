import { useEffect, useRef, useReducer } from "react";
import { useAuth } from "../../context/Contexts.jsx";
import InputComponent from "../InputComponent/Input.component.jsx";
import "./Form.component.css";

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

export default function FormComponent({
  enableUsername = true,
  enableEmail = true,
  enablePassword = true,
}) {
  const { login } = useAuth();
  const [state, dispatch] = useReducer(loginReducer, initialState);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  // Falta Username

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = emailInputRef.current?.value;
    const password = passwordInputRef.current?.value;
    // Falta Username

    dispatch({ type: "LOGIN_START" });

    try {
      await login({ email, password });
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
    <form onSubmit={handleSubmit} className="form">
      {/* Username input */}
      <InputComponent
        typeInput={"username"}
        isShowed={enableUsername}
        placeholder="Username"
      />

      {/* Email input */}
      <InputComponent
        typeInput={"email"}
        isShowed={enableEmail}
        placeholder="Email"
        ref={emailInputRef}
      />

      {/* Password input */}
      <InputComponent
        typeInput={"password"}
        isShowed={enablePassword}
        placeholder="Password"
        ref={passwordInputRef}
      />

      {state.error && <p className="error-message">{state.error}</p>}

      <button type="submit" className="submit-button" disabled={state.loading}>
        {state.loading ? "Loading..." : "Log in"}
      </button>
    </form>
  );
}
