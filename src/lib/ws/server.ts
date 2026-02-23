import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { URL } from "url";
import { liveFrameBus } from "@/lib/engine/live-frame-bus";
import {
  encodeBinaryFrame,
  type ServerMessage,
  type ClientMessage,
} from "./types";

interface RoomClient {
  ws: WebSocket;
  joinedAt: number;
}

const rooms = new Map<string, Set<RoomClient>>();
const cleanupFns = new Map<string, (() => void)[]>();

function getRoom(runId: string): Set<RoomClient> {
  let room = rooms.get(runId);
  if (!room) {
    room = new Set();
    rooms.set(runId, room);
    subscribeToFrameBus(runId);
  }
  return room;
}

function subscribeToFrameBus(runId: string) {
  const fns: (() => void)[] = [];

  fns.push(
    liveFrameBus.onFrame(runId, (frameBase64, width, height, timestamp) => {
      const room = rooms.get(runId);
      if (!room || room.size === 0) return;

      const jpegBuffer = Buffer.from(frameBase64, "base64");
      const binaryFrame = encodeBinaryFrame(jpegBuffer, width, height, timestamp);

      for (const client of room) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(binaryFrame, { binary: true });
        }
      }
    })
  );

  fns.push(
    liveFrameBus.onOverlay(runId, (message: ServerMessage) => {
      const room = rooms.get(runId);
      if (!room || room.size === 0) return;

      const json = JSON.stringify(message);
      for (const client of room) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(json);
        }
      }
    })
  );

  fns.push(
    liveFrameBus.onScreencastStarted(runId, (width, height, fps) => {
      const msg: ServerMessage = {
        type: "screencast_started",
        width,
        height,
        fps,
        timestamp: Date.now(),
      };
      broadcastJson(runId, msg);
    })
  );

  fns.push(
    liveFrameBus.onScreencastStopped(runId, () => {
      const msg: ServerMessage = {
        type: "screencast_stopped",
        timestamp: Date.now(),
      };
      broadcastJson(runId, msg);
    })
  );

  cleanupFns.set(runId, fns);
}

function broadcastJson(runId: string, message: ServerMessage) {
  const room = rooms.get(runId);
  if (!room || room.size === 0) return;

  const json = JSON.stringify(message);
  for (const client of room) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(json);
    }
  }
}

function removeClientFromRoom(runId: string, client: RoomClient) {
  const room = rooms.get(runId);
  if (!room) return;

  room.delete(client);

  if (room.size === 0) {
    rooms.delete(runId);
    const fns = cleanupFns.get(runId);
    if (fns) {
      fns.forEach((fn) => fn());
      cleanupFns.delete(runId);
    }
  }
}

function parseRunIdFromUrl(req: IncomingMessage): string | null {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    return url.searchParams.get("runId");
  } catch {
    return null;
  }
}

let wss: WebSocketServer | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

export function startWebSocketServer(port: number = 3001): WebSocketServer {
  if (wss) return wss;

  wss = new WebSocketServer({ port });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const runId = parseRunIdFromUrl(req);

    if (!runId) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Missing runId query parameter",
          timestamp: Date.now(),
        })
      );
      ws.close(4000, "Missing runId");
      return;
    }

    const client: RoomClient = { ws, joinedAt: Date.now() };
    const room = getRoom(runId);
    room.add(client);

    const ack: ServerMessage = {
      type: "connection_ack",
      runId,
      viewerCount: room.size,
      timestamp: Date.now(),
    };
    ws.send(JSON.stringify(ack));

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ClientMessage;
        if (msg.type === "pong") {
          // Keep-alive acknowledged
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on("close", () => {
      removeClientFromRoom(runId, client);
    });

    ws.on("error", () => {
      removeClientFromRoom(runId, client);
    });
  });

  heartbeatInterval = setInterval(() => {
    const ping: ServerMessage = { type: "heartbeat", timestamp: Date.now() };
    const json = JSON.stringify(ping);

    for (const room of rooms.values()) {
      for (const client of room) {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(json);
        } else if (
          client.ws.readyState !== WebSocket.CONNECTING
        ) {
          client.ws.terminate();
        }
      }
    }
  }, 30_000);

  console.log(`[Hound WS] WebSocket server running on port ${port}`);
  return wss;
}

export function stopWebSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    for (const [runId, fns] of cleanupFns) {
      fns.forEach((fn) => fn());
      cleanupFns.delete(runId);
    }
    rooms.clear();

    if (wss) {
      wss.close(() => {
        wss = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export function getViewerCount(runId: string): number {
  return rooms.get(runId)?.size ?? 0;
}
