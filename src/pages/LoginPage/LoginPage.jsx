import { useState, useEffect } from "react";
import { useAuth } from "../../context/Contexts.jsx";
import ThemeButtonComponent from "../../components/ThemeButtonComponent/ThemeButton.component";
import EyeOffIcon from "../../assets/Icons/EyeOffIcon";
import EyeIcon from "../../assets/Icons/EyeIcon";
import "./LoginPage.css";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const apiUrl = import.meta.env.VITE_API_URL;
    console.log("API URL:", apiUrl);

    if (!email || !password) {
      setError("Please enter both email and password.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      await login({ email, password });
    } catch (err) {
      setError(err.message || "Error logging in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          required
        />

        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            required
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
          </button>
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" className="button" disabled={loading}>
          {loading ? "Loading..." : "Log in"}
        </button>
      </form>
      <div></div>
    </div>
  );
}
