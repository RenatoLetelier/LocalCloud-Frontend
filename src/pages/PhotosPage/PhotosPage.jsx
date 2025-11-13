import { useEffect, useState } from "react";
import Gallery from "../../components/GalleryComponent/Gallery.component.jsx";
import Header from "../../components/HeaderComponent/Header.component.jsx";
import GridImagen from "../../components/GridImagen/GridImagen.component.jsx";
import "./PhotosPage.css";

export default function PhotosPage() {
  const [images, setImages] = useState([]);

  useEffect(() => {
    fetch("https://picsum.photos/v2/list")
      .then((response) => response.json())
      .then((data) => setImages(data));
  }, []);

  return (
    <>
      <Header />
      <main className="main-container">
        <Gallery>
          {images.map((image) => (
            <GridImagen
              key={image.id}
              imgUrl={image.download_url}
              altText={image.author}
            ></GridImagen>
          ))}
        </Gallery>
      </main>
    </>
  );
}
