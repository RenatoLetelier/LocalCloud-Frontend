import { getPhotoRequest } from "../../api/photos.js";
import { PhotosContext } from "../Contexts.jsx";

export const PhotosProvider = ({ children }) => {
  const getPhoto = async (id) => {
    try {
      const res = await getPhotoRequest(id);

      return res.data;
    } catch (error) {
      throw new Error("operation failed", { cause: error });
    }
  };

  return (
    <PhotosContext.Provider
      value={{
        getPhoto,
      }}
    >
      {children}
    </PhotosContext.Provider>
  );
};
