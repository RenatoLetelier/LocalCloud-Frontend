import { useState } from "react";
import { useNavigate } from "react-router-dom";
import EyeOffIcon from "../../assets/Icons/EyeOffIcon";
import EyeIcon from "../../assets/Icons/EyeIcon";
import "./LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        "https://local-cloud-backend.vercel.app/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!res.ok) {
        let msg = "Incorrect email or password";
        try {
          const maybeJson = await res.clone().json();
          msg = maybeJson?.message || msg;
        } catch {
          throw new Error(msg);
        }
      }

      const ct = res.headers.get("content-type") || "";
      let data = {};
      if (ct.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = {};
        }
      }

      const token =
        data?.token ??
        data?.access_token ??
        data?.body?.token ??
        data?.data?.token ??
        null;

      console.log("Login response data:", data);

      if (!token) {
        console.error("Login OK pero sin token en la respuesta:", data);
        throw new Error("No se recibió token desde el servidor.");
      }

      try {
        localStorage.setItem("token", token);
        console.log("Token guardado en localStorage");
      } catch (storageErr) {
        console.warn(
          "localStorage bloqueado, usando memoria de sesión:",
          storageErr
        );
        try {
          sessionStorage.setItem("token", token);
        } catch {
          console.error("sessionStorage también bloqueado:", storageErr);
          // como último recurso, mantén en estado global o contexto
        }
      }

      navigate("/");
    } catch (err) {
      console.error("Error en login:", err);
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Local Cloud</h1>
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
