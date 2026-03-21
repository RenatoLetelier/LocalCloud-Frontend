import api from "./axiosInstance.js";

export const getPhotos = () => api.get("/api/photos?sort=mtime&order=desc&limit=100");
export const getVideos = () => api.get("/api/videos?sort=mtime&order=desc&limit=100");
export const uploadPhotos = (formData) => api.post("/api/media/upload", formData);
export const getVideoUploadToken = () => api.get("/api/videos/upload-token");
export const deduplicateMedia = () => api.post("/api/media/deduplicate");
