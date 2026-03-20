import { Link } from "react-router-dom";
import "./Card.component.css";

export default function Card({ cardName, redirectPath, icon }) {
  return (
    <Link className="card-container" to={redirectPath ?? "/"}>
      {icon && <span className="card-icon">{icon}</span>}
      <h2 className="card-name">{cardName}</h2>
    </Link>
  );
}
