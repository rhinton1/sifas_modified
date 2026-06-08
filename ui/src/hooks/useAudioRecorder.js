// Records microphone input and sends audio chunks over WebSocket.
// Uses expo-av for cross-platform audio capture.

import { useState, useRef, useCallback } from "react";
import { Audio } from "expo-av";

const RECORDING_OPTIONS = {
    android: {
        extension: ".wav",
        outputFormat: Audio.AndroidOutputFormat.DEFAULT,
        audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
    },
    ios: {
        extension: ".wav",
        outputFormat: Audio.IOSOutputFormat.LINEARPCM,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
    },
    web: {},
};

export function useAudioRecorder(wsRef) {
    const [isRecording, setIsRecording] = useState(false);
    const recordingRef = useRef(null);

    const requestPermissions = useCallback(async () => {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== "granted") {
            throw new Error("Microphone permission denied");
        }
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
        });
    }, []);

    const startRecording = useCallback(async () => {
        try {
            await requestPermissions();

            const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
            recordingRef.current = recording;
            setIsRecording(true);
            console.log("[Audio] Recording started");
        } catch (err) {
            console.error("[Audio] Failed to start recording:", err);
            throw err;
        }
    }, [requestPermissions]);

    const stopRecording = useCallback(async () => {
        if (!recordingRef.current) return;

        try {
            await recordingRef.current.stopAndUnloadAsync();
            const uri = recordingRef.current.getURI();
            recordingRef.current = null;
            setIsRecording(false);

            // Signal server that speech has ended
            wsRef.current?.sendEndOfSpeech();

            // Read audio file and send as binary
            if (uri && wsRef.current) {
                const response = await fetch(uri);
                const buffer = await response.arrayBuffer();
                wsRef.current.sendAudioBytes(buffer);
            }

            console.log("[Audio] Recording stopped and sent");
        } catch (err) {
            console.error("[Audio] Failed to stop recording:", err);
        }
    }, [wsRef]);

    const cancelRecording = useCallback(async () => {
        if (!recordingRef.current) return;
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
        setIsRecording(false);
    }, []);

    return { isRecording, startRecording, stopRecording, cancelRecording };
}
