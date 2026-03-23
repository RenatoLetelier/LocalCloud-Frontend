import axios from "axios";

const baseURL = "/api/auth";

export const loginRequest = (user) =>
  axios({
    url: `${baseURL}/login`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: user,
  });
