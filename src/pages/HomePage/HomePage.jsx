import Header from "../../components/HeaderComponent/Header.component.jsx";
import Card from "../../components/CardComponent/Card.component.jsx";
import "./HomePage.css";

export default function HomePage() {
  return (
    <div className="home-page">
      <Header />
      <main className="home-main">
        <div className="home-grid">
          <Card cardName="Movies" redirectPath="/movies" icon="🎬" />
          <Card cardName="Gallery" redirectPath="/gallery" icon="🖼" />
          <Card cardName="Passwords" redirectPath="/passwords" icon="🔑" />
        </div>
      </main>
    </div>
  );
}
