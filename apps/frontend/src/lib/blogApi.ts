import axios from "axios";

// `??` (not `||`) so an explicitly empty VITE_BLOG_URL stays "" (same-origin,
// proxied by nginx in branch envs); only an unset var falls back to prod.
const BLOG_URL = import.meta.env.VITE_BLOG_URL ?? "https://blog.odinvestor.net";

export const blogApi = axios.create({
  baseURL: BLOG_URL,
  withCredentials: true,
});
