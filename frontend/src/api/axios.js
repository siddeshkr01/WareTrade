import axios from "axios";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true
});

API.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let sessionExpiredHandler = null;
export const setSessionExpiredHandler = (handler) => {
    sessionExpiredHandler = handler;
};

API.interceptors.response.use(
    (res) => res,
    (error) => {
        const isLoginRequest = error.config?.url?.includes("/user/login");
        if (error.response?.status === 401 && !isLoginRequest && sessionExpiredHandler) {
            sessionExpiredHandler();
        }
        return Promise.reject(error);
    }
);

export default API;