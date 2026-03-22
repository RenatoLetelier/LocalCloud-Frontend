import api from "./axiosInstance.js";

export const getPhotos = () => api.get("/api/photos?sort=mtime&order=desc&limit=100");
export const getVideos = () => api.get("/api/videos?sort=mtime&order=desc&limit=100");
export const uploadPhotos = (formData) => api.post("/api/media/upload", formData);

/** Upload a single file with per-byte progress. `onProgress(0‥100)` is called as bytes arrive. */
export const uploadPhotoFile = (file, onProgress) => {
  const fd = new FormData();
  fd.append("files", file);
  return api.post("/api/media/upload", fd, {
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
    },
  });
};
export const getVideoUploadToken = () => api.get("/api/videos/upload-token");
export const deduplicateMedia = () => api.post("/api/media/deduplicate");
export const getUserMedia     = ()     => api.get("/api/user-media");
export const createUserMedia  = (data) => api.post("/api/user-media", data);
