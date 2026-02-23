import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { liveFrameBus } from "@/lib/engine/live-frame-bus";
import type { ServerMessage } from "@/lib/ws/types";

/**
 * SSE fallback for live browser view when WebSocket is unavailable.
 * Streams base64-encoded JPEG frames and overlay events.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { runId } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      const cleanupFrame = liveFrameBus.onFrame(
        runId,
        (frameBase64: string, width: number, height: number, timestamp: number) => {
          send("frame", { data: frameBase64, width, height, timestamp });
        }
      );

      const cleanupOverlay = liveFrameBus.onOverlay(
        runId,
        (message: ServerMessage) => {
          send("overlay", message);
        }
      );

      const cleanupStarted = liveFrameBus.onScreencastStarted(
        runId,
        (width: number, height: number, fps: number) => {
          send("screencast_started", { width, height, fps, timestamp: Date.now() });
        }
      );

      const cleanupStopped = liveFrameBus.onScreencastStopped(runId, () => {
        send("screencast_stopped", { timestamp: Date.now() });
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });

      const cleanup = () => {
        cleanupFrame();
        cleanupOverlay();
        cleanupStarted();
        cleanupStopped();
        clearTimeout(timeout);
      };

      const timeout = setTimeout(() => {
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }, 600_000); // 10 minute timeout for live sessions

      request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
