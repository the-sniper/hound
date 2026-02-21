import { EventEmitter } from "events";
import type { RunEvent } from "@/types/run";

class RunEventBus extends EventEmitter {
  emitRunEvent(event: RunEvent) {
    this.emit(`run:${event.runId}`, event);
  }

  onRunEvent(runId: string, handler: (event: RunEvent) => void) {
    this.on(`run:${runId}`, handler);
    return () => this.off(`run:${runId}`, handler);
  }
}

const globalForEvents = globalThis as unknown as {
  runEventBus: RunEventBus | undefined;
};

export const runEventBus = globalForEvents.runEventBus ?? new RunEventBus();
runEventBus.setMaxListeners(100);

if (process.env.NODE_ENV !== "production")
  globalForEvents.runEventBus = runEventBus;
