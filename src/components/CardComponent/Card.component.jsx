import { useNavigate } from "react-router-dom";
import "./Card.component.css";

export default function Card({ cardName, redirectPath }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (redirectPath) navigate(redirectPath);
  };

  return (
    <div className="card-container" onClick={handleClick}>
      <h2>{cardName}</h2>
    </div>
  );
}
