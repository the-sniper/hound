export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameMetadata {
  width: number;
  height: number;
  timestamp: number;
  sessionId?: number;
}

// --- Server → Client messages ---

export interface FrameMessage {
  type: "frame";
  data: string; // base64-encoded JPEG (for JSON transport / SSE fallback)
  width: number;
  height: number;
  timestamp: number;
}

export interface CursorMoveMessage {
  type: "cursor_move";
  x: number;
  y: number;
  timestamp: number;
}

export interface ClickIndicatorMessage {
  type: "click_indicator";
  x: number;
  y: number;
  timestamp: number;
}

export interface ElementHighlightMessage {
  type: "element_highlight";
  highlights: (BoundingBox & { label?: string })[];
  timestamp: number;
}

export interface StepInfoMessage {
  type: "step_info";
  stepId: string;
  stepName: string;
  stepType: string;
  status: "running" | "passed" | "failed";
  timestamp: number;
}

export interface ErrorMessage {
  type: "error";
  message: string;
  timestamp: number;
}

export interface ConnectionAckMessage {
  type: "connection_ack";
  runId: string;
  viewerCount: number;
  timestamp: number;
}

export interface HeartbeatMessage {
  type: "heartbeat";
  timestamp: number;
}

export interface ScreencastStartedMessage {
  type: "screencast_started";
  width: number;
  height: number;
  fps: number;
  timestamp: number;
}

export interface ScreencastStoppedMessage {
  type: "screencast_stopped";
  timestamp: number;
}

export type ServerMessage =
  | FrameMessage
  | CursorMoveMessage
  | ClickIndicatorMessage
  | ElementHighlightMessage
  | StepInfoMessage
  | ErrorMessage
  | ConnectionAckMessage
  | HeartbeatMessage
  | ScreencastStartedMessage
  | ScreencastStoppedMessage;

// --- Client → Server messages ---

export interface ClientJoinMessage {
  type: "join";
  runId: string;
}

export interface ClientPongMessage {
  type: "pong";
}

export interface ClientSetFpsMessage {
  type: "set_fps";
  fps: number;
}

export type ClientMessage =
  | ClientJoinMessage
  | ClientPongMessage
  | ClientSetFpsMessage;

// Binary frame protocol: first 12 bytes are metadata header, rest is JPEG data
// Header layout: [width: uint16, height: uint16, timestamp: float64]
export const BINARY_HEADER_SIZE = 12;

export function encodeBinaryFrame(
  jpegBuffer: Buffer,
  width: number,
  height: number,
  timestamp: number
): Buffer {
  const header = Buffer.alloc(BINARY_HEADER_SIZE);
  header.writeUInt16BE(width, 0);
  header.writeUInt16BE(height, 2);
  header.writeDoubleBE(timestamp, 4);
  return Buffer.concat([header, jpegBuffer]);
}

export function decodeBinaryFrameHeader(data: ArrayBuffer): FrameMetadata {
  const view = new DataView(data, 0, BINARY_HEADER_SIZE);
  return {
    width: view.getUint16(0),
    height: view.getUint16(2),
    timestamp: view.getFloat64(4),
  };
}
