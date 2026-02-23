export type RunStatus = "PENDING" | "RUNNING" | "PASSED" | "FAILED" | "ERROR";
export type StepResultStatus =
  | "PENDING"
  | "RUNNING"
  | "PASSED"
  | "FAILED"
  | "SKIPPED";

export interface RunWithResults {
  id: string;
  status: RunStatus;
  environment: string;
  baseUrl: string;
  duration: number | null;
  failureAnalysis: string | null;
  testId: string;
  projectId: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  test: {
    id: string;
    name: string;
  };
  results: {
    id: string;
    status: StepResultStatus;
    duration: number | null;
    screenshotUrl: string | null;
    error: string | null;
    logs: unknown;
    aiResponse: unknown;
    cacheHit: boolean;
    retryCount: number;
    stepId: string;
    step: {
      id: string;
      orderIndex: number;
      type: string;
      description: string;
      maxRetries: number;
    };
  }[];
}

export interface RunEvent {
  type:
    | "step_start"
    | "step_complete"
    | "step_error"
    | "step_retry"
    | "run_complete"
    | "run_error"
    | "screenshot";
  runId: string;
  stepId?: string;
  status?: StepResultStatus;
  error?: string;
  screenshotUrl?: string;
  duration?: number;
  retryCount?: number;
  cacheHit?: boolean;
  timestamp: number;
}
