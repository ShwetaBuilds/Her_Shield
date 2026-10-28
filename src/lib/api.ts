import axios from "axios";
import { clearAuth, getToken } from "./auth";

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? "http://localhost:5000/api").replace(
  /\/+$/,
  "",
);

export const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isPublicAuthRequest = error.config?.url?.startsWith("/auth/");
    if (error.response?.status === 401 && getToken() && !isPublicAuthRequest) {
      clearAuth();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("her-shield:session-expired"));
      }
    }
    return Promise.reject(error);
  },
);

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  age?: number | null;
  gender?: "Male" | "Female" | "Other";
  bloodGroup?: string;
  address?: string;
  profileImage?: string;
};

export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-"
  | "Prefer not to say";

export type EmergencyContact = {
  _id: string;
  name: string;
  phone: string;
  relation: string;
  priority: "High" | "Medium" | "Low";
  smsConsent: boolean;
  journeyShareConsent: boolean;
};

export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post<{ token: string; user: UserProfile }>("/auth/login", data),
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    age: number;
    address: string;
    bloodGroup?: BloodGroup;
  }) => api.post<{ token: string; user: UserProfile }>("/auth/signup", data),
  forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
};

export const userApi = {
  getProfile: () => api.get<UserProfile>("/users/profile"),
  updateProfile: (
    data: Partial<Pick<UserProfile, "name" | "phone" | "gender" | "bloodGroup" | "address">> & {
      age?: number | null;
    },
  ) => api.put<UserProfile>("/users/profile", data),
};

export const dashboardApi = {
  get: () => api.get<DashboardData>("/users/dashboard"),
};

export const contactApi = {
  get: () => api.get<EmergencyContact[]>("/contacts"),
  create: (data: Omit<EmergencyContact, "_id">) => api.post<EmergencyContact>("/contacts", data),
  update: (id: string, data: Partial<Omit<EmergencyContact, "_id">>) =>
    api.put<EmergencyContact>(`/contacts/${id}`, data),
  remove: (id: string) => api.delete(`/contacts/${id}`),
};

export type SosRecord = {
  _id: string;
  triggeredAt: string;
  status: string;
  location?: { latitude: number; longitude: number };
  notes?: string;
  notificationError?: string;
  notificationAttempts?: {
    contactName: string;
    status: string;
    attemptedAt: string;
    deliveredAt?: string;
    providerErrorCode?: string;
  }[];
};

export type DashboardData = {
  user: Pick<UserProfile, "id" | "name" | "email" | "phone" | "profileImage">;
  emergencyContacts: EmergencyContact[];
  sosHistory: SosRecord[];
  locationHistory: { recordedAt: string }[];
  notifications: { _id: string; message?: string; createdAt: string }[];
  recentReports: { _id: string; createdAt: string }[];
};

export type SafetyJourney = {
  _id: string;
  destination: string;
  expectedArrivalAt: string;
  status: "active" | "completed" | "cancelled";
  startedAt: string;
  notifyContactIds: string[];
  checkIns: { _id?: string; checkedInAt: string }[];
  completedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  notificationAttempts: {
    eventType: string;
    contactName: string;
    status: string;
    attemptedAt: string;
    deliveredAt?: string;
    providerErrorCode?: string;
  }[];
};

export const journeyApi = {
  list: () => api.get<SafetyJourney[]>("/journeys"),
  create: (data: { destination: string; expectedArrivalAt: string; notifyContactIds: string[] }) =>
    api.post<SafetyJourney>("/journeys", data),
  checkIn: (id: string) =>
    api.post<SafetyJourney>(
      `/journeys/${id}/check-in`,
      {},
      { headers: { "Idempotency-Key": crypto.randomUUID() } },
    ),
  extend: (id: string, expectedArrivalAt: string) =>
    api.patch<SafetyJourney>(`/journeys/${id}/extend`, { expectedArrivalAt }),
  complete: (id: string) => api.patch<SafetyJourney>(`/journeys/${id}/complete`),
  cancel: (id: string) => api.patch<SafetyJourney>(`/journeys/${id}/cancel`),
  remove: (id: string) => api.delete(`/journeys/${id}`),
};

export const sosApi = {
  list: () => api.get<SosRecord[]>("/sos"),
  create: (
    data: {
      location?: { latitude: number; longitude: number };
      notes?: string;
      contactIds?: string[];
    },
    idempotencyKey: string = crypto.randomUUID(),
  ) =>
    api.post<SosRecord>("/sos", data, {
      headers: { "Idempotency-Key": idempotencyKey },
    }),
};

export const locationApi = {
  record: (data: { latitude: number; longitude: number }) => api.post("/location", data),
};
