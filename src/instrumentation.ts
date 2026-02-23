export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWebSocketServer } = await import("@/lib/ws/server");
    const port = parseInt(process.env.WS_PORT ?? "3001", 10);
    startWebSocketServer(port);
  }
}
