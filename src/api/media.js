import api from "./axiosInstance.js";

export const getPhotos = () => api.get("/api/photos");
export const getVideos = () => api.get("/api/videos");
