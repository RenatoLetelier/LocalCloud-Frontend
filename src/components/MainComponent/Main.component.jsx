import Gallery from "../GalleryComponent/Gallery.component";
import Card from "../CardComponent/Card.component";
import "./Main.component.css";

export default function Main() {
  return (
    <main className="main-container">
      <Gallery>
        <Card cardName={"Movies Project"} redirectPath="/movies" />
        <Card cardName={"Photos Project"} redirectPath="/photos" />
        <Card cardName={"Passwords Project"} redirectPath="/passwords" />
      </Gallery>
    </main>
  );
}
