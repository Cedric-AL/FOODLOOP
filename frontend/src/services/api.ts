import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api",
  withCredentials: true,
});
let csrf = "";
export async function refreshCsrf() {
  csrf = (await api.get("/auth/csrf", { timeout: 15000 })).data.token;
}
api.interceptors.request.use((config) => {
  if (config.method !== "get") config.headers["X-CSRF-TOKEN"] = csrf;
  return config;
});
export default api;
