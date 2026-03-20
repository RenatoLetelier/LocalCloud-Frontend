import ThemeButtonComponent from "../../components/ThemeButtonComponent/ThemeButton.component";
import FormComponent from "../../components/FormComponent/Form.component.jsx";
import "./LoginPage.css";

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="theme-button-container">
        <ThemeButtonComponent />
      </div>

      <div className="login-card">
        <h1 className="login-title">Local Cloud</h1>
        <FormComponent
          enableUsername={false}
          enableEmail={true}
          enablePassword={true}
        />
      </div>
    </div>
  );
}
