import axios from "axios";

const BLOG_URL = import.meta.env.VITE_BLOG_URL || "https://blog.odinvestor.net";

export const blogApi = axios.create({
  baseURL: BLOG_URL,
  withCredentials: true,
});
