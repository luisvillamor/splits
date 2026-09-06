"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const TABLES = [
  "expenses",
  "fees",
  "receipts",
  "bill_contributions",
  "settlement_transfers",
  "split_sessions",
  "split_participants",
  "activity_logs",
  "expense_participants",
] as const;

export function useSplitRealtime(splitId: string, onChange: () => void) {
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`split:${splitId}`);

    for (const table of TABLES) {
      const filter =
        table === "expense_participants" ? undefined : `split_id=eq.${splitId}`;
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        onChange,
      );
    }

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [splitId, onChange]);
}
