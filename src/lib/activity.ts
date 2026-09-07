export function describeActivity(action: string, actor: string, data?: unknown) {
  const payload = (data ?? {}) as {
    name?: string;
    amount?: number;
    participantCount?: number;
  };

  switch (action) {
    case "created_split":
      return payload.participantCount
        ? `${actor} created this Split with ${payload.participantCount} people`
        : `${actor} created this Split`;
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
    case "added_participant":
      return `${actor} added ${payload.name ?? "a member"} to this Split`;
    case "removed_participant":
      return `${actor} removed ${payload.name ?? "a member"} from this Split`;
    case "finalized_split":
      return `${actor} finalized the Split`;
    case "unfinalized_split":
      return `${actor} reopened the Split`;
    case "marked_paid":
      return `${actor} marked a payment as paid`;
    case "updated_payment":
      return `${actor} updated a payment`;
    default:
      return `${actor} updated the Split`;
  }
}
