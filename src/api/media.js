import api from "./axiosInstance.js";

export const getPhotos = ({ sort = "mtime", order = "desc", limit = 100 } = {}) =>
  api.get(`/api/photos?sort=${sort}&order=${order}&limit=${limit}`);

export const getVideos = ({ sort = "mtime", order = "desc", limit = 100 } = {}) =>
  api.get(`/api/videos?sort=${sort}&order=${order}&limit=${limit}`);

export const uploadPhotos = (formData) => api.post("/api/media/upload", formData);
export const getVideoUploadToken = () => api.get("/api/videos/upload-token");
export const deduplicateMedia = () => api.post("/api/media/deduplicate");
export const getUserMedia = () => api.get("/api/user-media");
