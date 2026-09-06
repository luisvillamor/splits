export function describeActivity(action: string, actor: string, data?: unknown) {
  const payload = (data ?? {}) as {
    name?: string;
    amount?: number;
    participantCount?: number;
  };

  switch (action) {
    case "created_split":
      return `${actor} created this Split`;
    case "added_expense":
      return `${actor} added ${payload.name ?? "an expense"}`;
    case "added_shared_expense":
      return `${actor} added ${payload.name ?? "a shared expense"}${
        payload.participantCount
          ? ` shared by ${payload.participantCount} people`
          : ""
      }`;
    case "edited_expense":
      return `${actor} edited ${payload.name ?? "an expense"}`;
    case "deleted_expense":
      return `${actor} removed ${payload.name ?? "an expense"}`;
    case "added_fee":
    case "updated_fee":
      return `${actor} updated ${payload.name ?? "a fee"}`;
    case "uploaded_receipt":
      return `${actor} uploaded the receipt`;
    case "finalized_split":
      return `${actor} finalized the Split`;
    case "marked_paid":
      return `${actor} marked a payment as paid`;
    default:
      return `${actor} updated the Split`;
  }
}
