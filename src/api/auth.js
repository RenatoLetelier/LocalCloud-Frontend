import axios from "axios";

const baseURL = `${import.meta.env.VITE_API_URL}/api/auth`;

export const loginRequest = (user) =>
  axios({
    url: `${baseURL}/login`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: user,
  });
