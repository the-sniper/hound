"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  BINARY_HEADER_SIZE,
  type ServerMessage,
  type FrameMessage,
} from "@/lib/ws/types";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

export interface OverlayEvent {
  type: ServerMessage["type"];
  data: ServerMessage;
}

export interface LiveBrowserViewRef {
  captureFrame: () => string | null;
}

interface LiveBrowserViewProps {
  runId: string;
  isRunning: boolean;
  wsPort?: number;
  onConnectionChange?: (status: ConnectionStatus) => void;
  onOverlayEvent?: (event: OverlayEvent) => void;
  onFpsUpdate?: (fps: number) => void;
  className?: string;
}

const WS_RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;

export const LiveBrowserView = forwardRef<LiveBrowserViewRef, LiveBrowserViewProps>(
  function LiveBrowserView(
    {
      runId,
      isRunning,
      wsPort = 3001,
      onConnectionChange,
      onOverlayEvent,
      onFpsUpdate,
      className = "",
    },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const sseRef = useRef<EventSource | null>(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
    const frameCount = useRef(0);
    const fpsTimer = useRef<ReturnType<typeof setInterval>>();
    const [status, setStatus] = useState<ConnectionStatus>("disconnected");
    const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });
    const [usingSSE, setUsingSSE] = useState(false);

    const updateStatus = useCallback(
      (s: ConnectionStatus) => {
        setStatus(s);
        onConnectionChange?.(s);
      },
      [onConnectionChange]
    );

    const renderFrame = useCallback(
      async (frameData: ArrayBuffer | Blob | string, width?: number, height?: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let blob: Blob;

        if (typeof frameData === "string") {
          const binary = atob(frameData);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: "image/jpeg" });
        } else if (frameData instanceof ArrayBuffer) {
          const jpegData = new Uint8Array(frameData, BINARY_HEADER_SIZE);
          blob = new Blob([jpegData], { type: "image/jpeg" });
        } else {
          blob = frameData;
        }

        try {
          const bitmap = await createImageBitmap(blob);

          if (width && height) {
            setDimensions({ width, height });
            canvas.width = width;
            canvas.height = height;
          }

          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          bitmap.close();
          frameCount.current++;
        } catch {
          // Frame decode error — skip
        }
      },
      []
    );

    const connectSSE = useCallback(() => {
      if (sseRef.current) return;

      const eventSource = new EventSource(`/api/runs/${runId}/live`);
      sseRef.current = eventSource;
      setUsingSSE(true);
      updateStatus("connecting");

      eventSource.addEventListener("frame", (e) => {
        try {
          const data = JSON.parse(e.data) as FrameMessage;
          renderFrame(data.data, data.width, data.height);
        } catch {
          // Parse error
        }
      });

      eventSource.addEventListener("overlay", (e) => {
        try {
          const msg = JSON.parse(e.data) as ServerMessage;
          onOverlayEvent?.({ type: msg.type, data: msg });
        } catch {
          // Parse error
        }
      });

      eventSource.addEventListener("screencast_started", () => {
        updateStatus("connected");
      });

      eventSource.addEventListener("screencast_stopped", () => {
        eventSource.close();
        sseRef.current = null;
        updateStatus("disconnected");
      });

      eventSource.onopen = () => {
        updateStatus("connected");
      };

      eventSource.onerror = () => {
        eventSource.close();
        sseRef.current = null;
        updateStatus("disconnected");
      };
    }, [runId, updateStatus, renderFrame, onOverlayEvent]);

    const connectWS = useCallback(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const wsUrl = `${protocol}//${host}:${wsPort}?runId=${encodeURIComponent(runId)}`;

      updateStatus("connecting");

      try {
        const ws = new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttempts.current = 0;
          updateStatus("connected");
        };

        ws.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            const view = new DataView(event.data, 0, BINARY_HEADER_SIZE);
            const width = view.getUint16(0);
            const height = view.getUint16(2);
            renderFrame(event.data, width, height);
          } else {
            try {
              const msg = JSON.parse(event.data as string) as ServerMessage;

              switch (msg.type) {
                case "heartbeat":
                  ws.send(JSON.stringify({ type: "pong" }));
                  break;
                case "screencast_started":
                  setDimensions({ width: msg.width, height: msg.height });
                  break;
                case "screencast_stopped":
                  updateStatus("disconnected");
                  break;
                case "connection_ack":
                  break;
                default:
                  onOverlayEvent?.({ type: msg.type, data: msg });
              }
            } catch {
              // Parse error
            }
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (isRunning && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
            updateStatus("reconnecting");
            reconnectAttempts.current++;
            reconnectTimer.current = setTimeout(connectWS, WS_RECONNECT_DELAY);
          } else if (isRunning) {
            connectSSE();
          } else {
            updateStatus("disconnected");
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (isRunning) {
          connectSSE();
        }
      }
    }, [runId, wsPort, isRunning, updateStatus, renderFrame, onOverlayEvent, connectSSE]);

    useImperativeHandle(ref, () => ({
      captureFrame: () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return canvas.toDataURL("image/png");
      },
    }));

    useEffect(() => {
      if (!isRunning) {
        wsRef.current?.close();
        sseRef.current?.close();
        sseRef.current = null;
        updateStatus("disconnected");
        return;
      }

      connectWS();

      fpsTimer.current = setInterval(() => {
        onFpsUpdate?.(frameCount.current);
        frameCount.current = 0;
      }, 1000);

      return () => {
        clearTimeout(reconnectTimer.current);
        clearInterval(fpsTimer.current);
        wsRef.current?.close();
        wsRef.current = null;
        if (sseRef.current) {
          sseRef.current.close();
          sseRef.current = null;
        }
      };
    }, [isRunning, connectWS, updateStatus, onFpsUpdate]);

    return (
      <div className={`relative bg-black/90 rounded-2xl overflow-hidden ${className}`}>
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto"
          style={{ aspectRatio: `${dimensions.width}/${dimensions.height}` }}
        />

        {status !== "connected" && isRunning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              </div>
              <p className="text-sm text-white/70 font-medium">
                {status === "connecting" && "Connecting to live view..."}
                {status === "reconnecting" && `Reconnecting... (attempt ${reconnectAttempts.current})`}
              </p>
              {usingSSE && (
                <p className="text-xs text-white/40">Using SSE fallback</p>
              )}
            </div>
          </div>
        )}

        {!isRunning && status === "disconnected" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="flex flex-col items-center gap-2 text-white/50">
              <svg
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
                />
              </svg>
              <p className="text-sm font-medium">Stream ended</p>
              <p className="text-xs text-white/30">Run has completed</p>
            </div>
          </div>
        )}
      </div>
    );
  }
);
