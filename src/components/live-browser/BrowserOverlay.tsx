"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { OverlayEvent } from "./LiveBrowserView";
import type {
  CursorMoveMessage,
  ClickIndicatorMessage,
  ElementHighlightMessage,
  StepInfoMessage,
  BoundingBox,
} from "@/lib/ws/types";

interface BrowserOverlayProps {
  overlayEvents: OverlayEvent[];
  viewportWidth: number;
  viewportHeight: number;
  containerWidth: number;
  containerHeight: number;
}

interface ClickRipple {
  id: string;
  x: number;
  y: number;
}

interface Highlight extends BoundingBox {
  label?: string;
}

export function BrowserOverlay({
  overlayEvents,
  viewportWidth,
  viewportHeight,
  containerWidth,
  containerHeight,
}: BrowserOverlayProps) {
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [clicks, setClicks] = useState<ClickRipple[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [stepInfo, setStepInfo] = useState<{
    stepName: string;
    stepType: string;
    status: "running" | "passed" | "failed";
  } | null>(null);

  const scaleX = containerWidth / (viewportWidth || 1);
  const scaleY = containerHeight / (viewportHeight || 1);

  const handleOverlayEvent = useCallback(
    (event: OverlayEvent) => {
      const msg = event.data;

      switch (msg.type) {
        case "cursor_move": {
          const cm = msg as CursorMoveMessage;
          setCursorPos({ x: cm.x * scaleX, y: cm.y * scaleY });
          break;
        }
        case "click_indicator": {
          const ci = msg as ClickIndicatorMessage;
          const id = `click-${Date.now()}-${Math.random()}`;
          setClicks((prev) => [...prev.slice(-5), { id, x: ci.x * scaleX, y: ci.y * scaleY }]);
          setTimeout(() => {
            setClicks((prev) => prev.filter((c) => c.id !== id));
          }, 800);
          break;
        }
        case "element_highlight": {
          const eh = msg as ElementHighlightMessage;
          setHighlights(
            eh.highlights.map((h) => ({
              x: h.x * scaleX,
              y: h.y * scaleY,
              width: h.width * scaleX,
              height: h.height * scaleY,
              label: h.label,
            }))
          );
          setTimeout(() => setHighlights([]), 3000);
          break;
        }
        case "step_info": {
          const si = msg as StepInfoMessage;
          setStepInfo({
            stepName: si.stepName,
            stepType: si.stepType,
            status: si.status,
          });
          break;
        }
      }
    },
    [scaleX, scaleY]
  );

  useEffect(() => {
    const latest = overlayEvents[overlayEvents.length - 1];
    if (latest) {
      handleOverlayEvent(latest);
    }
  }, [overlayEvents, handleOverlayEvent]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Cursor */}
      <AnimatePresence>
        {cursorPos && (
          <motion.div
            key="cursor"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: cursorPos.x - 8,
              y: cursorPos.y - 8,
            }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-0 left-0 z-30"
          >
            <div className="relative">
              <div className="h-4 w-4 rounded-full bg-primary/80 shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
              <div className="absolute -inset-1 rounded-full bg-primary/20 animate-ping" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click ripples */}
      <AnimatePresence>
        {clicks.map((click) => (
          <motion.div
            key={click.id}
            initial={{ opacity: 0.8, scale: 0.2 }}
            animate={{ opacity: 0, scale: 1.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute z-20"
            style={{
              left: click.x - 24,
              top: click.y - 24,
            }}
          >
            <div className="h-12 w-12 rounded-full border-2 border-primary/60 bg-primary/10" />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Element highlights */}
      <AnimatePresence>
        {highlights.map((hl, i) => (
          <motion.div
            key={`highlight-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute z-10 border-2 border-primary/50 bg-primary/5 rounded-sm"
            style={{
              left: hl.x,
              top: hl.y,
              width: hl.width,
              height: hl.height,
            }}
          >
            {hl.label && (
              <div className="absolute -top-6 left-0 px-2 py-0.5 bg-primary/90 text-white text-[10px] font-medium rounded whitespace-nowrap shadow-lg">
                {hl.label}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Step info badge */}
      <AnimatePresence mode="wait">
        {stepInfo && (
          <motion.div
            key={`step-${stepInfo.stepName}-${stepInfo.status}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-3 left-3 z-40"
          >
            <div
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                backdrop-blur-md shadow-lg
                ${
                  stepInfo.status === "running"
                    ? "bg-blue-500/20 text-blue-100 border border-blue-400/30"
                    : stepInfo.status === "passed"
                      ? "bg-green-500/20 text-green-100 border border-green-400/30"
                      : "bg-red-500/20 text-red-100 border border-red-400/30"
                }
              `}
            >
              {stepInfo.status === "running" && (
                <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              )}
              {stepInfo.status === "passed" && (
                <svg className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {stepInfo.status === "failed" && (
                <svg className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="text-white/50 uppercase tracking-wider text-[9px]">
                {stepInfo.stepType}
              </span>
              <span>{stepInfo.stepName}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
