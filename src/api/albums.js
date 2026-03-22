import api from "./axiosInstance.js";

export const getAlbums  = ()           => api.get("/api/albums");
export const createAlbum = (name, description) =>
  api.post("/api/albums", description ? { name, description } : { name });
export const getAlbum   = (id)         => api.get(`/api/albums/${id}`);
export const patchAlbum = (id, data)   => api.patch(`/api/albums/${id}`, data);
export const deleteAlbum = (id)        => api.delete(`/api/albums/${id}`);
export const addAlbumItem    = (albumId, userMediaId) =>
  api.post(`/api/albums/${albumId}/items`, { userMediaId });
export const removeAlbumItem = (albumId, userMediaId) =>
  api.delete(`/api/albums/${albumId}/items/${userMediaId}`);
