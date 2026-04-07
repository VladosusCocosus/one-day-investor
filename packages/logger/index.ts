import pino from "pino";

const root = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino/file", options: { destination: 1 } }
      : undefined,
});

export function createLogger(name: string) {
  return root.child({ service: name });
}

export type Logger = pino.Logger;
export default root;
