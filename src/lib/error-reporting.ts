type ErrorReportingOptions = {
  context?: Record<string, unknown>;
};

type ErrorReportingEvents = {
  captureException?: (
    error: unknown,
    options?: ErrorReportingOptions,
  ) => void;
};

declare global {
  interface Window {
    __appEvents?: ErrorReportingEvents;
  }
}

export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;

  window.__appEvents?.captureException?.(error, {
    context,
  });
}