"use client";

import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Camera,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ConnectionStatus } from "./LiveBrowserView";

interface BrowserToolbarProps {
  connectionStatus: ConnectionStatus;
  fps: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onCapture: () => void;
  onFullscreen: () => void;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; className: string }
> = {
  connected: {
    label: "Live",
    className: "bg-green-500/10 text-green-600 border-green-200/50",
  },
  connecting: {
    label: "Connecting",
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-200/50",
  },
  reconnecting: {
    label: "Reconnecting",
    className: "bg-yellow-500/10 text-yellow-600 border-yellow-200/50",
  },
  disconnected: {
    label: "Offline",
    className: "bg-muted text-muted-foreground border-border/50",
  },
};

export function BrowserToolbar({
  connectionStatus,
  fps,
  zoom,
  onZoomChange,
  onCapture,
  onFullscreen,
}: BrowserToolbarProps) {
  const statusConfig = STATUS_CONFIG[connectionStatus];

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-card/80 backdrop-blur-sm border border-border/40 rounded-xl">
      {/* Left: Connection status */}
      <div className="flex items-center gap-2">
        {connectionStatus === "connected" ? (
          <Wifi className="h-3.5 w-3.5 text-green-500" />
        ) : connectionStatus === "disconnected" ? (
          <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Wifi className="h-3.5 w-3.5 text-yellow-500 animate-pulse" />
        )}
        <Badge
          variant="outline"
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0 ${statusConfig.className}`}
        >
          {connectionStatus === "connected" && (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
          )}
          {statusConfig.label}
        </Badge>
        {connectionStatus === "connected" && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {fps} fps
          </span>
        )}
      </div>

      {/* Center: Zoom controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onZoomChange(Math.max(25, zoom - 25))}
          disabled={zoom <= 25}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <button
          className="text-xs text-muted-foreground hover:text-foreground tabular-nums min-w-[40px] text-center transition-colors"
          onClick={() => onZoomChange(100)}
          title="Reset to 100%"
        >
          {zoom}%
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onZoomChange(Math.min(200, zoom + 25))}
          disabled={zoom >= 200}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onCapture}
          title="Capture screenshot"
        >
          <Camera className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onFullscreen}
          title="Fullscreen"
        >
          <Maximize className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
