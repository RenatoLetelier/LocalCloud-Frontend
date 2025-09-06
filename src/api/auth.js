import axios from "axios";

const SUBURL = "/api/auth";

export const loginRequest = (user) =>
  axios({
    url: `${SUBURL}/login`,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    data: user,
  });
