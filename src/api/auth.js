import axios from "axios";

const SUBURL = "/api/auth";

export const loginRequest = (user) => axios.post(`${SUBURL}/login`, user);
