/**
 * Allowed actions when responding to a connection request.
 */
export enum ConnectionResponseAction {
  ACCEPT = "accept",
  REJECT = "reject",
}

const ACTION_VALUES = new Set<string>(Object.values(ConnectionResponseAction));

export function isConnectionResponseAction(
  value: unknown,
): value is ConnectionResponseAction {
  return (
    typeof value === "string" &&
    ACTION_VALUES.has(value.trim().toLowerCase())
  );
}

export function parseConnectionResponseAction(
  value: unknown,
): ConnectionResponseAction | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return ACTION_VALUES.has(normalized)
    ? (normalized as ConnectionResponseAction)
    : null;
}
