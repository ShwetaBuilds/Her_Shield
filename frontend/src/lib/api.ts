import axios from "axios";

const API_URL = "https://her-shield-backend.onrender.com/api";
type SignupData = { name: string; email: string; password: string; phone?: string };
type ProfileUpdate = {
  name?: string;
  phone?: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  address?: string;
};

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if it exists
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token on 401
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// Auth API endpoints
export const authAPI = {
  signup: (data: SignupData) => apiClient.post("/auth/signup", data),
  login: (email: string, password: string) => apiClient.post("/auth/login", { email, password }),
  logout: () => apiClient.post("/auth/logout"),
};

// Users API endpoints
export const usersAPI = {
  getProfile: () => apiClient.get("/users/profile"),
  updateProfile: (data: ProfileUpdate) => apiClient.put("/users/profile", data),
};

export default apiClient;
