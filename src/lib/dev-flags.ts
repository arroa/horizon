/** Solo desarrollo local — nunca activar en producción. */
export function isDevBypassEnabled(): boolean {
  return process.env.HORIZON_DEV_BYPASS === "true" && process.env.NODE_ENV !== "production";
}

export function isDevUserId(userId: string): boolean {
  return userId.startsWith("dev:");
}
