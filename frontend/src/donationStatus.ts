// Group legacy states without changing stored records.
export const donationStages = [
  "SUBMITTED",
  "AVAILABLE",
  "SCHEDULED_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
];
export const donationGroup = (status: string) =>
  status === "UNDER_REVIEW"
    ? "SUBMITTED"
    : status === "MATCHED"
      ? "SCHEDULED_FOR_PICKUP"
      : status;
export const donationLabel = (status: string) =>
  (
    ({
      SUBMITTED: "Awaiting review",
      AVAILABLE: "Available",
      SCHEDULED_FOR_PICKUP: "Awaiting pickup",
      COMPLETED: "Completed",
      CANCELLED: "Cancelled",
    }) as Record<string, string>
  )[donationGroup(status)] || status.toLowerCase().replaceAll("_", " ");
