import { EventEmitter } from "events";
import type { ServerMessage } from "@/lib/ws/types";

/**
 * Bridges screencast frames and overlay events to both WebSocket and SSE consumers.
 * High-frequency bus — frame data flows through here at up to 30fps per run.
 */
class LiveFrameBus extends EventEmitter {
  emitFrame(runId: string, frameBase64: string, width: number, height: number) {
    this.emit(`frame:${runId}`, frameBase64, width, height, Date.now());
  }

  onFrame(
    runId: string,
    handler: (frameBase64: string, width: number, height: number, timestamp: number) => void
  ) {
    this.on(`frame:${runId}`, handler);
    return () => this.off(`frame:${runId}`, handler);
  }

  emitOverlay(runId: string, message: ServerMessage) {
    this.emit(`overlay:${runId}`, message);
  }

  onOverlay(runId: string, handler: (message: ServerMessage) => void) {
    this.on(`overlay:${runId}`, handler);
    return () => this.off(`overlay:${runId}`, handler);
  }

  emitScreencastStarted(runId: string, width: number, height: number, fps: number) {
    this.emit(`started:${runId}`, width, height, fps);
  }

  onScreencastStarted(
    runId: string,
    handler: (width: number, height: number, fps: number) => void
  ) {
    this.on(`started:${runId}`, handler);
    return () => this.off(`started:${runId}`, handler);
  }

  emitScreencastStopped(runId: string) {
    this.emit(`stopped:${runId}`);
  }

  onScreencastStopped(runId: string, handler: () => void) {
    this.on(`stopped:${runId}`, handler);
    return () => this.off(`stopped:${runId}`, handler);
  }

  cleanupRun(runId: string) {
    this.removeAllListeners(`frame:${runId}`);
    this.removeAllListeners(`overlay:${runId}`);
    this.removeAllListeners(`started:${runId}`);
    this.removeAllListeners(`stopped:${runId}`);
  }
}

const globalForLiveFrames = globalThis as unknown as {
  liveFrameBus: LiveFrameBus | undefined;
};

export const liveFrameBus =
  globalForLiveFrames.liveFrameBus ?? new LiveFrameBus();
liveFrameBus.setMaxListeners(200);

if (process.env.NODE_ENV !== "production")
  globalForLiveFrames.liveFrameBus = liveFrameBus;
