// Central HTTP client for the Django REST backend.

import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api";

async function getAuthHeaders() {
    const token = await AsyncStorage.getItem("auth_token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Token ${token}` } : {}),
    };
}

async function request(method, path, body = null, isFormData = false) {
    const token = await AsyncStorage.getItem("auth_token");
    const headers = {
        ...(token ? { Authorization: `Token ${token}` } : {}),
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
    };

    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.detail || `HTTP ${res.status}`);
    }

    return res.status === 204 ? null : res.json();
}

// Auth
export const register = (username, email, password) =>
    request("POST", "/auth/register/", { username, email, password });

export const login = (username, password) =>
    request("POST", "/auth/login/", { username, password });

// Avatars
export const listAvatars = () => request("GET", "/avatars/");

export const createAvatar = (formData) =>
    request("POST", "/avatars/", formData, true);

export const deleteAvatar = (avatarId) =>
    request("DELETE", `/avatars/${avatarId}/`);

export const cloneVoice = (avatarId, formData) =>
    request("POST", `/avatars/${avatarId}/clone-voice/`, formData, true);

// Sessions
export const createSession = (avatarId) =>
    request("POST", "/sessions/", { avatar_id: avatarId });

export const getSession = (sessionId) =>
    request("GET", `/sessions/${sessionId}/`);

export const endSession = (sessionId) =>
    request("POST", `/sessions/${sessionId}/end/`);
