import api from "./axiosInstance.js";

export const getPhotos  = (page = 1, limit = 100) => api.get(`/api/photos?page=${page}&limit=${limit}`);
export const getVideos  = (page = 1, limit = 100) => api.get(`/api/videos?page=${page}&limit=${limit}`);
export const uploadPhotos = (formData) => api.post("/api/media/upload", formData);

/** Update a photo's metadata fields. `filename` is the media-server filename. */
export const patchPhoto = (filename, data) => api.patch(`/api/photos/${filename}`, data);
/** Update a video's metadata fields. `filename` must be inside `data`. */
export const patchVideo = (data)           => api.patch("/api/videos", data);

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
export const deleteUserMedia  = (id)   => api.delete(`/api/user-media/${id}`);
export const deletePhoto      = (id)   => api.delete(`/api/photos/${id}`);
export const deleteVideo      = (id)   => api.delete(`/api/videos/${id}`);
