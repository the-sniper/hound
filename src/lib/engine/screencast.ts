import type { Page, CDPSession } from "playwright";
import { liveFrameBus } from "./live-frame-bus";
import type {
  CursorMoveMessage,
  ClickIndicatorMessage,
  ElementHighlightMessage,
  StepInfoMessage,
  BoundingBox,
} from "@/lib/ws/types";

export interface ScreencastOptions {
  runId: string;
  fps?: number;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export class ScreencastManager {
  private cdpSession: CDPSession | null = null;
  private running = false;
  private runId: string;
  private fps: number;
  private quality: number;
  private maxWidth: number;
  private maxHeight: number;
  private frameWidth = 0;
  private frameHeight = 0;

  constructor(options: ScreencastOptions) {
    this.runId = options.runId;
    this.fps = Math.min(options.fps ?? 15, 30);
    this.quality = Math.min(Math.max(options.quality ?? 65, 10), 100);
    this.maxWidth = options.maxWidth ?? 1280;
    this.maxHeight = options.maxHeight ?? 720;
  }

  async start(page: Page): Promise<void> {
    if (this.running) return;

    this.cdpSession = await page.context().newCDPSession(page);

    this.cdpSession.on(
      "Page.screencastFrame",
      (params: { data: string; metadata: { offsetTop: number; pageScaleFactor: number; deviceWidth: number; deviceHeight: number }; sessionId: number }) => {
        if (!this.running) return;

        this.frameWidth = params.metadata.deviceWidth;
        this.frameHeight = params.metadata.deviceHeight;

        liveFrameBus.emitFrame(
          this.runId,
          params.data,
          this.frameWidth,
          this.frameHeight
        );

        this.cdpSession?.send("Page.screencastFrameAck", {
          sessionId: params.sessionId,
        }).catch(() => {
          // Session may be closed
        });
      }
    );

    await this.cdpSession.send("Page.startScreencast", {
      format: "jpeg",
      quality: this.quality,
      maxWidth: this.maxWidth,
      maxHeight: this.maxHeight,
      everyNthFrame: Math.max(1, Math.round(60 / this.fps)),
    });

    this.running = true;

    liveFrameBus.emitScreencastStarted(
      this.runId,
      this.maxWidth,
      this.maxHeight,
      this.fps
    );
  }

  async stop(): Promise<void> {
    if (!this.running || !this.cdpSession) return;

    this.running = false;

    try {
      await this.cdpSession.send("Page.stopScreencast");
      await this.cdpSession.detach();
    } catch {
      // Session may already be detached
    }

    liveFrameBus.emitScreencastStopped(this.runId);
    this.cdpSession = null;
  }

  isRunning(): boolean {
    return this.running;
  }

  emitCursorMove(x: number, y: number) {
    if (!this.running) return;
    const msg: CursorMoveMessage = {
      type: "cursor_move",
      x,
      y,
      timestamp: Date.now(),
    };
    liveFrameBus.emitOverlay(this.runId, msg);
  }

  emitClick(x: number, y: number) {
    if (!this.running) return;
    const msg: ClickIndicatorMessage = {
      type: "click_indicator",
      x,
      y,
      timestamp: Date.now(),
    };
    liveFrameBus.emitOverlay(this.runId, msg);
  }

  emitElementHighlight(highlights: (BoundingBox & { label?: string })[]) {
    if (!this.running) return;
    const msg: ElementHighlightMessage = {
      type: "element_highlight",
      highlights,
      timestamp: Date.now(),
    };
    liveFrameBus.emitOverlay(this.runId, msg);
  }

  emitStepInfo(stepId: string, stepName: string, stepType: string, status: "running" | "passed" | "failed") {
    if (!this.running) return;
    const msg: StepInfoMessage = {
      type: "step_info",
      stepId,
      stepName,
      stepType,
      status,
      timestamp: Date.now(),
    };
    liveFrameBus.emitOverlay(this.runId, msg);
  }

  getFrameDimensions(): { width: number; height: number } {
    return { width: this.frameWidth, height: this.frameHeight };
  }
}
