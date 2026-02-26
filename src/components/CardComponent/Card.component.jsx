import { Link } from "react-router-dom";
import "./Card.component.css";

export default function Card({ cardName, redirectPath }) {
  return (
    <Link className="card-container" to={redirectPath ?? "/"}>
      <h2>{cardName}</h2>
    </Link>
  );
}
