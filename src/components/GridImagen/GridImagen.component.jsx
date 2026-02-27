import "./GridImagen.component.css";

export default function GridImagen({ imgUrl, altText }) {
  return (
    <div className="img-wrapper">
      <img className="imgItem" src={imgUrl} alt={altText} />
    </div>
  );
}
