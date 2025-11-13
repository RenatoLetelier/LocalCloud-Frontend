import Header from "../../components/HeaderComponent/Header.component.jsx";
import Gallery from "../../components/GalleryComponent/Gallery.component.jsx";
import Card from "../../components/CardComponent/Card.component.jsx";
import "./HomePage.css";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="main-container">
        <Gallery>
          <Card cardName={"Movies Project"} redirectPath="/movies" />
          <Card cardName={"Photos Project"} redirectPath="/photos" />
          <Card cardName={"Passwords Project"} redirectPath="/passwords" />
        </Gallery>
      </main>
    </>
  );
}
