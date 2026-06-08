import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { login as apiLogin, register as apiRegister } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const stored = await AsyncStorage.getItem("auth_token");
            const storedUser = await AsyncStorage.getItem("auth_user");
            if (stored && storedUser) {
                setToken(stored);
                setUser(JSON.parse(storedUser));
            }
            setLoading(false);
        })();
    }, []);

    const login = async (username, password) => {
        const data = await apiLogin(username, password);
        await AsyncStorage.setItem("auth_token", data.token);
        await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
    };

    const register = async (username, email, password) => {
        const data = await apiRegister(username, email, password);
        await AsyncStorage.setItem("auth_token", data.token);
        await AsyncStorage.setItem("auth_user", JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
    };

    const logout = async () => {
        await AsyncStorage.multiRemove(["auth_token", "auth_user"]);
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
