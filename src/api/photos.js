import axios from "axios";

const baseURL = `${import.meta.env.VITE_API_URL}/api/photos`;

export const getPhotoRequest = (id) =>
  axios({
    url: `${baseURL}/${id}`,
    method: "GET",
    headers: { "Content-Type": "application/json" },
    data: id,
  });

export const getPhotosRequest = () =>
  axios({
    url: `${baseURL}/`,
    method: "GET",
    headers: { "Content-Type": "application/json" },
    data: null,
  });
