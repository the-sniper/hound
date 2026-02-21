import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { runEventBus } from "@/lib/engine/events";
import type { RunEvent } from "@/types/run";

export async function GET(
  _request: NextRequest,
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

      const send = (data: RunEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Stream closed
        }
      };

      const cleanup = runEventBus.onRunEvent(runId, (event) => {
        send(event);
        if (
          event.type === "run_complete" ||
          event.type === "run_error"
        ) {
          cleanup();
          try {
            controller.close();
          } catch {
            // Already closed
          }
        }
      });

      // Timeout after 5 minutes
      const timeout = setTimeout(() => {
        cleanup();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }, 300000);

      // Cleanup on abort
      _request.signal.addEventListener("abort", () => {
        cleanup();
        clearTimeout(timeout);
      });
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
