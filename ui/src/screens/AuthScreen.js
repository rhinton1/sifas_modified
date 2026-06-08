import React, { useState } from "react";
import {
    Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function AuthScreen() {
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!username.trim() || !password.trim()) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }
        setLoading(true);
        try {
            if (isLogin) {
                await login(username.trim(), password);
            } else {
                await register(username.trim(), email.trim(), password);
            }
        } catch (err) {
            Alert.alert("Error", err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <Text style={styles.title}>Avatar AI</Text>
            <Text style={styles.subtitle}>{isLogin ? "Welcome back" : "Create your account"}</Text>

            <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#999"
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
            />

            {!isLogin && (
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                />
            )}

            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>{isLogin ? "Sign In" : "Create Account"}</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                <Text style={styles.toggle}>
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f0f1a", justifyContent: "center", padding: 24 },
    title: { fontSize: 36, fontWeight: "800", color: "#a78bfa", textAlign: "center", marginBottom: 4 },
    subtitle: { fontSize: 16, color: "#888", textAlign: "center", marginBottom: 36 },
    input: {
        backgroundColor: "#1e1e2e", color: "#fff", borderRadius: 12,
        padding: 16, fontSize: 16, marginBottom: 14,
        borderWidth: 1, borderColor: "#2d2d3d",
    },
    button: {
        backgroundColor: "#7c3aed", borderRadius: 12,
        padding: 16, alignItems: "center", marginTop: 8,
    },
    buttonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
    toggle: { color: "#a78bfa", textAlign: "center", marginTop: 20, fontSize: 14 },
});
