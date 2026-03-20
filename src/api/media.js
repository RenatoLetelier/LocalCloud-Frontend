import api from "./axiosInstance.js";

export const getPhotos = () => api.get("/api/photos");
export const getVideos = () => api.get("/api/videos");
export const uploadMedia = (formData) =>
  api.post("/api/media/upload", formData);
export const deduplicateMedia = () => api.post("/api/media/deduplicate");
