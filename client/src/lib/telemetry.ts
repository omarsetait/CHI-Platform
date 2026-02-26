export interface ClientTelemetryEvent {
  event: string;
  payload: Record<string, unknown>;
  ts: string;
}

let initialized = false;

export function trackClientEvent(event: string, payload: Record<string, unknown> = {}): void {
  const telemetryEvent: ClientTelemetryEvent = {
    event,
    payload,
    ts: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("platform:telemetry", { detail: telemetryEvent }));
  }

  if (import.meta.env.DEV) {
    // Keep this lightweight; production integrations can hook to platform:telemetry.
    console.debug("[telemetry]", telemetryEvent);
  }
}

export function initializeClientTelemetry(): void {
  if (initialized || typeof window === "undefined") {
    return;
  }

  initialized = true;

  window.addEventListener("error", (event) => {
    trackClientEvent("client.error", {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    trackClientEvent("client.unhandled_rejection", {
      reason: String(event.reason),
    });
  });
}
