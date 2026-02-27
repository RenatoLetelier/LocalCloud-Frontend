import { createContext, useContext } from "react";

export const PhotosContext = createContext();
export const usePhotos = () => {
  const context = useContext(PhotosContext);
  if (!context) {
    throw new Error("usePhotos must be used within an PhotosProvider");
  }
  return context;
};

export const AuthContext = createContext();
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const MoviesContext = createContext();
export const useMovies = () => {
  const context = useContext(MoviesContext);
  if (!context) {
    throw new Error("useMovies must be used within an MoviesProvider");
  }
  return context;
};
