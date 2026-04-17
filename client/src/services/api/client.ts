import axios from "axios";
import { attachInterceptors } from "@/services/api/interceptors";
import { API_BASE_URL } from "@/shared/config/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

attachInterceptors(apiClient);
