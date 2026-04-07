import axios from "axios";

export const marketApi = axios.create({
  baseURL: import.meta.env.VITE_MARKET_URL,
  withCredentials: true,
});
