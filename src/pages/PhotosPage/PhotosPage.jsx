import Gallery from "../../components/GalleryComponent/Gallery.component.jsx";
import Card from "../../components/CardComponent/Card.component.jsx";
import Header from "../../components/HeaderComponent/Header.component.jsx";

export default function PhotosPage() {
  return (
    <>
      <Header />
      <main className="main-container">
        <Gallery>
          <Card cardName={"Photo 1"} />
          <Card cardName={"Photo 2"} />
        </Gallery>
      </main>
    </>
  );
}
