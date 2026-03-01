import axios from "axios";

const envUrl = import.meta.env.VITE_API_URL;
const API_BASE =
  envUrl === "" || envUrl === '""' || envUrl == null
    ? import.meta.env.DEV
      ? "http://localhost:3000"
      : ""
    : envUrl;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

export const getAuthHeaders = () => {
  const username = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  return username ? { "x-user": encodeURIComponent(username) } : {};
};

export const apiUrl = (path: string) => `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
