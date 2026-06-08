// Manages the WebSocket connection to the Django Channels AvatarConsumer.

const WS_BASE = process.env.EXPO_PUBLIC_WS_URL || "ws://localhost:8000";

export class AvatarWebSocket {
    constructor(sessionId, handlers = {}) {
        this.sessionId = sessionId;
        this.handlers = handlers;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnects = 3;
    }

    connect() {
        const url = `${WS_BASE}/ws/session/${this.sessionId}/`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log("[WS] Connected:", this.sessionId);
            this.reconnectAttempts = 0;
            this.handlers.onConnect?.();
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                this._route(msg);
            } catch (e) {
                console.warn("[WS] Failed to parse message:", e);
            }
        };

        this.ws.onerror = (err) => {
            console.error("[WS] Error:", err.message);
            this.handlers.onError?.(err);
        };

        this.ws.onclose = (event) => {
            console.log("[WS] Closed:", event.code, event.reason);
            this.handlers.onDisconnect?.(event);

            if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnects) {
                this.reconnectAttempts++;
                const delay = Math.pow(2, this.reconnectAttempts) * 500;
                console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
                setTimeout(() => this.connect(), delay);
            }
        };
    }

    _route(msg) {
        switch (msg.type) {
            case "transcript":
                this.handlers.onTranscript?.(msg.text);
                break;
            case "llm_chunk":
                this.handlers.onLLMChunk?.(msg.text);
                break;
            case "audio_ready":
                this.handlers.onAudioReady?.(msg.url);
                break;
            case "video_ready":
                this.handlers.onVideoReady?.(msg.url);
                break;
            case "barge_in_ack":
                this.handlers.onBargeInAck?.();
                break;
            case "error":
                this.handlers.onServerError?.(msg.message);
                break;
            default:
                console.log("[WS] Unknown message type:", msg.type);
        }
    }

    sendAudioChunk(base64Data) {
        this._send({ type: "audio_chunk", data: base64Data });
    }

    sendAudioBytes(arrayBuffer) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(arrayBuffer);
        }
    }

    sendEndOfSpeech() {
        this._send({ type: "end_of_speech" });
    }

    sendBargeIn() {
        this._send({ type: "barge_in" });
    }

    _send(obj) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(obj));
        } else {
            console.warn("[WS] Cannot send, socket not open");
        }
    }

    disconnect() {
        this.maxReconnects = 0; // prevent auto-reconnect
        this.ws?.close(1000, "User disconnected");
        this.ws = null;
    }
}
