import ThemeButtonComponent from "../../components/ThemeButtonComponent/ThemeButton.component";
import FormComponent from "../../components/FormComponent/Form.component.jsx";
import "./LoginPage.css";

export default function LoginPage() {
  return (
    <div className="login-page-container">
      <div className="theme-button-container">
        <ThemeButtonComponent />
      </div>

      <h1>Local Cloud</h1>

      <FormComponent
        enableUsername={false}
        enableEmail={true}
        enablePassword={true}
      />

      <br />
    </div>
  );
}
