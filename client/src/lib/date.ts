/**
 * Format a date string or Date for display (e.g. "Jan 1, 2025").
 * Returns "—" for invalid or empty input.
 */
export function formatShortDate(
  dateInput: string | Date | null | undefined,
): string {
  if (dateInput == null || dateInput === "") return "—";
  try {
    const d =
      dateInput instanceof Date
        ? dateInput
        : new Date(
            dateInput.includes("T") ? dateInput : `${dateInput}T00:00:00`,
          );
    return isNaN(d.getTime())
      ? String(dateInput)
      : d.toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  } catch {
    return String(dateInput);
  }
}
