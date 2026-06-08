import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, FlatList, TouchableOpacity, Image,
    StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { listAvatars, createAvatar, deleteAvatar } from "../services/api";

export default function AvatarSelectScreen({ navigation }) {
    const [avatars, setAvatars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchAvatars = useCallback(async () => {
        try {
            const data = await listAvatars();
            setAvatars(data);
        } catch (err) {
            Alert.alert("Error", "Failed to load avatars.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAvatars();
    }, [fetchAvatars]);

    const handleCreateAvatar = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (perm.status !== "granted") {
            Alert.alert("Permission required", "Please allow photo access.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.9,
        });

        if (result.canceled) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("name", `Avatar ${avatars.length + 1}`);
            formData.append("source_photo", {
                uri: result.assets[0].uri,
                type: "image/jpeg",
                name: "avatar.jpg",
            });

            const newAvatar = await createAvatar(formData);
            setAvatars((prev) => [newAvatar, ...prev]);
            Alert.alert("Success", "Avatar created! You can now start a session.");
        } catch (err) {
            Alert.alert("Error", err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAvatar = (avatarId) => {
        Alert.alert("Delete Avatar", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive",
                onPress: async () => {
                    await deleteAvatar(avatarId);
                    setAvatars((prev) => prev.filter((a) => a.id !== avatarId));
                },
            },
        ]);
    };

    const renderAvatar = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("Session", { avatar: item })}
            onLongPress={() => handleDeleteAvatar(item.id)}
        >
            {item.source_photo ? (
                <Image
                    source={{ uri: `http://localhost:8000${item.source_photo}` }}
                    style={styles.avatar}
                />
            ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarInitial}>{item.name[0]}</Text>
                </View>
            )}
            <Text style={styles.cardName}>{item.name}</Text>
            <Text style={styles.cardStatus}>{item.is_ready ? "Ready" : "Processing..."}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Your Avatars</Text>
            <Text style={styles.subtitle}>Tap an avatar to start a conversation</Text>

            {loading ? (
                <ActivityIndicator color="#7c3aed" size="large" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={avatars}
                    keyExtractor={(item) => item.id}
                    renderItem={renderAvatar}
                    numColumns={2}
                    columnWrapperStyle={styles.row}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <Text style={styles.empty}>No avatars yet. Tap + to create one.</Text>
                    }
                />
            )}

            <TouchableOpacity
                style={styles.fab}
                onPress={handleCreateAvatar}
                disabled={uploading}
            >
                {uploading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.fabText}>+</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f0f1a" },
    title: { fontSize: 28, fontWeight: "800", color: "#fff", margin: 24, marginBottom: 4 },
    subtitle: { fontSize: 14, color: "#888", marginHorizontal: 24, marginBottom: 16 },
    list: { paddingHorizontal: 16, paddingBottom: 100 },
    row: { justifyContent: "space-between", marginBottom: 16 },
    card: {
        backgroundColor: "#1e1e2e", borderRadius: 16,
        width: "48%", alignItems: "center", padding: 16,
        borderWidth: 1, borderColor: "#2d2d3d",
    },
    avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 10 },
    avatarPlaceholder: { backgroundColor: "#7c3aed", justifyContent: "center", alignItems: "center" },
    avatarInitial: { fontSize: 32, color: "#fff", fontWeight: "700" },
    cardName: { color: "#fff", fontSize: 15, fontWeight: "600" },
    cardStatus: { color: "#888", fontSize: 12, marginTop: 4 },
    empty: { color: "#555", textAlign: "center", marginTop: 60, fontSize: 16 },
    fab: {
        position: "absolute", bottom: 32, right: 24,
        backgroundColor: "#7c3aed", width: 60, height: 60,
        borderRadius: 30, justifyContent: "center", alignItems: "center",
        shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
    },
    fabText: { color: "#fff", fontSize: 28, fontWeight: "300", lineHeight: 32 },
});