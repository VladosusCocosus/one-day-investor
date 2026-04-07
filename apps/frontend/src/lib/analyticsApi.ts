import axios from "axios";

export const analyticsApi = axios.create({
  baseURL: import.meta.env.VITE_ANALYTICS_URL,
  withCredentials: true,
});
