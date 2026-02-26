import { useEffect, useState } from "react";
import Gallery from "../../components/GalleryComponent/Gallery.component.jsx";
import Header from "../../components/HeaderComponent/Header.component.jsx";
import GridImagen from "../../components/GridImagen/GridImagen.component.jsx";
import "./PhotosPage.css";

export default function PhotosPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch("https://picsum.photos/v2/list")
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setImages(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Header />
      <main className="main-container">
        {loading && <p>Loading photos…</p>}
        {error && <p>Error: {error}</p>}
        {!loading && !error && (
          <Gallery>
            {images.map((image) => (
              <GridImagen
                key={image.id}
                imgUrl={image.download_url}
                altText={image.author}
              />
            ))}
          </Gallery>
        )}
      </main>
    </>
  );
}
