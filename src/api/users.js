import api from "./axiosInstance.js";

export const getUsers = (page = 1, pageSize = 100) =>
  api.get(`/api/users?page=${page}&pageSize=${pageSize}`);
