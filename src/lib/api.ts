import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

export const getAuthHeaders = () => {
  const username = typeof window !== "undefined" ? localStorage.getItem("username") : null;
  return username ? { "x-user": encodeURIComponent(username) } : {};
};

export const apiUrl = (path: string) => `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
