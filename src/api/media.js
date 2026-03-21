import api from "./axiosInstance.js";

export const getPhotos = () => api.get("/api/photos");
export const getVideos = () => api.get("/api/videos");
export const uploadPhotos = (formData) => api.post("/api/media/upload", formData);
export const uploadVideo  = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/api/videos/upload", formData);
};
export const deduplicateMedia = () => api.post("/api/media/deduplicate");
