import axios from "axios";
import { attachInterceptors } from "@/services/api/interceptors";

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 10000,
});

attachInterceptors(apiClient);
