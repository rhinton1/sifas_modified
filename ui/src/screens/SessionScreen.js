// The main real-time avatar interaction screen.
// Pipeline: Mic → WebSocket → ASR → LLM → TTS/Video → Playback

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, Alert, ActivityIndicator, Image, Animated,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Audio } from "expo-av";

import { createSession, endSession } from "../services/api";
import { AvatarWebSocket } from "../services/websocket";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:8000";

export default function SessionScreen({ route, navigation }) {
    const { avatar } = route.params;

    const [sessionId, setSessionId] = useState(null);
    const [connecting, setConnecting] = useState(true);
    const [transcript, setTranscript] = useState("");
    const [llmResponse, setLlmResponse] = useState("");
    const [videoUrl, setVideoUrl] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [status, setStatus] = useState("Connecting...");
    const [messages, setMessages] = useState([]);
    const [avatarSpeaking, setAvatarSpeaking] = useState(false);

    const wsRef = useRef(null);
    const soundRef = useRef(null);
    const videoRef = useRef(null);
    const scrollRef = useRef(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const llmBufferRef = useRef("");

    const { isRecording, startRecording, stopRecording } = useAudioRecorder(wsRef);

    // Pulse animation when recording
    useEffect(() => {
        if (isRecording) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isRecording, pulseAnim]);

    // Setup WebSocket handlers
    const buildWSHandlers = useCallback(
        () => ({
            onConnect: () => {
                setStatus("Ready");
                setConnecting(false);
            },
            onTranscript: (text) => {
                setTranscript(text);
                llmBufferRef.current = "";
                setLlmResponse("");
                setStatus("Avatar is thinking...");
            },
            onLLMChunk: (chunk) => {
                llmBufferRef.current += chunk;
                setLlmResponse(llmBufferRef.current);
            },
            onAudioReady: async (url) => {
                setStatus("Avatar is speaking...");
                setAvatarSpeaking(true);
                await playAudio(`${API_BASE}${url}`);
            },
            onVideoReady: (url) => {
                setVideoUrl(url);
            },
            onBargeInAck: () => {
                soundRef.current?.pauseAsync();
                videoRef.current?.pauseAsync();
                setAvatarSpeaking(false);
                setStatus("Ready");
            },
            onServerError: (msg) => {
                Alert.alert("Error", msg);
                setStatus("Ready");
            },
            onDisconnect: () => setStatus("Reconnecting..."),
        }),
        []
    );

    const playAudio = async (url) => {
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
            }
            const { sound } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: true },
                (playbackStatus) => {
                    if (playbackStatus.didJustFinish) {
                        setAvatarSpeaking(false);
                        setStatus("Ready");
                        // Commit message pair to history
                        setMessages((prev) => [
                            ...prev,
                            { role: "user", text: transcript },
                            { role: "avatar", text: llmBufferRef.current },
                        ]);
                        setTranscript("");
                        setLlmResponse("");
                    }
                }
            );
            soundRef.current = sound;
        } catch (err) {
            console.error("[Audio] Playback error:", err);
        }
    };

    // Initialize session on mount
    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const session = await createSession(avatar.id);
                if (!mounted) return;

                setSessionId(session.id);
                wsRef.current = new AvatarWebSocket(session.id, buildWSHandlers());
                wsRef.current.connect();
            } catch (err) {
                Alert.alert("Error", "Failed to start session: " + err.message);
                navigation.goBack();
            }
        })();

        return () => {
            mounted = false;
            soundRef.current?.unloadAsync();
            wsRef.current?.disconnect();
        };
    }, []);

    const handleEndSession = async () => {
        wsRef.current?.disconnect();
        if (sessionId) await endSession(sessionId).catch(() => {});
        navigation.goBack();
    };

    const handleBargeIn = () => {
        wsRef.current?.sendBargeIn();
    };

    const handleMicPress = async () => {
        if (avatarSpeaking) {
            handleBargeIn();
        }
        if (!isRecording) {
            await startRecording();
            setStatus("Listening...");
        } else {
            await stopRecording();
            setStatus("Processing...");
        }
    };

    if (connecting) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator color="#7c3aed" size="large" />
                <Text style={styles.connectingText}>Connecting to avatar...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleEndSession} style={styles.endBtn}>
                    <Text style={styles.endBtnText}>End</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{avatar.name}</Text>
                <View style={[styles.statusDot, { backgroundColor: status === "Ready" ? "#22c55e" : "#f59e0b" }]} />
            </View>

            {/* Avatar display */}
            <View style={styles.avatarContainer}>
                {videoUrl ? (
                    <Video
                        ref={videoRef}
                        source={{ uri: videoUrl }}
                        style={styles.avatarVideo}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay
                        isLooping={false}
                        onPlaybackStatusUpdate={(s) => {
                            if (s.didJustFinish) setVideoUrl(null);
                        }}
                    />
                ) : (
                    <Image
                        source={
                            avatar.source_photo
                                ? { uri: `${API_BASE}${avatar.source_photo}` }
                                : require("../assets/avatar-placeholder.png")
                        }
                        style={styles.avatarImage}
                    />
                )}

                {avatarSpeaking && (
                    <View style={styles.speakingIndicator}>
                        {[0, 1, 2].map((i) => (
                            <Animated.View key={i} style={[styles.bar, { height: 8 + i * 6 }]} />
                        ))}
                    </View>
                )}
            </View>

            {/* LLM response */}
            {llmResponse ? (
                <View style={styles.responseBubble}>
                    <Text style={styles.responseText}>{llmResponse}</Text>
                </View>
            ) : null}

            {/* Conversation history */}
            <ScrollView
                ref={scrollRef}
                style={styles.history}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                {messages.map((msg, idx) => (
                    <View
                        key={idx}
                        style={[
                            styles.messageBubble,
                            msg.role === "user" ? styles.userBubble : styles.avatarBubble,
                        ]}
                    >
                        <Text style={styles.messageText}>{msg.text}</Text>
                    </View>
                ))}
            </ScrollView>

            {/* Status + transcript */}
            <View style={styles.footer}>
                <Text style={styles.statusText}>{status}</Text>
                {transcript ? <Text style={styles.transcriptText}>"{transcript}"</Text> : null}

                {/* Mic button */}
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <TouchableOpacity
                        style={[styles.micBtn, isRecording && styles.micBtnActive, avatarSpeaking && styles.micBtnBargeIn]}
                        onPress={handleMicPress}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.micIcon}>
                            {avatarSpeaking ? "✋" : isRecording ? "⏹" : "🎤"}
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
                <Text style={styles.micHint}>
                    {avatarSpeaking
                        ? "Tap to interrupt"
                        : isRecording
                            ? "Tap to stop"
                            : "Hold to speak"}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0f0f1a" },
    centered: { justifyContent: "center", alignItems: "center" },
    connectingText: { color: "#888", marginTop: 16, fontSize: 16 },

    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        padding: 16, paddingTop: 52, borderBottomWidth: 1, borderBottomColor: "#1e1e2e",
    },
    headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
    endBtn: { backgroundColor: "#ef4444", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
    endBtnText: { color: "#fff", fontWeight: "700" },
    statusDot: { width: 10, height: 10, borderRadius: 5 },

    avatarContainer: {
        alignItems: "center", justifyContent: "center",
        marginVertical: 16, position: "relative",
    },
    avatarImage: { width: 200, height: 200, borderRadius: 100, borderWidth: 3, borderColor: "#7c3aed" },
    avatarVideo: { width: 240, height: 240, borderRadius: 120 },
    speakingIndicator: {
        position: "absolute", bottom: -8,
        flexDirection: "row", gap: 4, alignItems: "flex-end",
    },
    bar: { width: 4, backgroundColor: "#7c3aed", borderRadius: 2 },

    responseBubble: {
        marginHorizontal: 20, backgroundColor: "#1e1e2e",
        borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#7c3aed",
    },
    responseText: { color: "#e2e8f0", fontSize: 15, lineHeight: 22 },

    history: { flex: 1, marginHorizontal: 16, marginTop: 8 },
    messageBubble: { maxWidth: "80%", borderRadius: 16, padding: 12, marginVertical: 4 },
    userBubble: { backgroundColor: "#7c3aed", alignSelf: "flex-end" },
    avatarBubble: { backgroundColor: "#1e1e2e", alignSelf: "flex-start", borderWidth: 1, borderColor: "#2d2d3d" },
    messageText: { color: "#fff", fontSize: 14, lineHeight: 20 },

    footer: { alignItems: "center", paddingBottom: 40, paddingTop: 12 },
    statusText: { color: "#888", fontSize: 13, marginBottom: 4 },
    transcriptText: { color: "#a78bfa", fontSize: 14, marginBottom: 12, fontStyle: "italic" },
    micBtn: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: "#7c3aed", justifyContent: "center", alignItems: "center",
        shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
    },
    micBtnActive: { backgroundColor: "#ef4444" },
    micBtnBargeIn: { backgroundColor: "#f59e0b" },
    micIcon: { fontSize: 28 },
    micHint: { color: "#555", fontSize: 12, marginTop: 8 },
});
