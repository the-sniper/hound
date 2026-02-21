export interface LocatorResult {
  selector: string;
  confidence: number;
  reasoning: string;
  alternativeSelectors?: string[];
}

export interface AssertionResult {
  passed: boolean;
  explanation: string;
  evidence: string[];
}

export interface FailureAnalysis {
  summary: string;
  rootCause: string;
  suggestedFix: string;
  confidence: number;
}

export interface AIAgentContext {
  pageUrl: string;
  pageTitle: string;
  accessibilityTree: string;
  screenshot?: string;
  previousSteps?: {
    type: string;
    description: string;
    status: string;
  }[];
  formElements?: Array<{
    tag: string;
    type?: string;
    name?: string;
    id?: string;
    placeholder?: string;
    ariaLabel?: string;
    classes?: string;
    text?: string;
  }>;
}
