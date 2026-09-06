"use server";

import { createClient } from "@/lib/supabase/server";
import { getSplitBundle } from "@/lib/data";

export async function getReceiptUrlAction(splitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const bundle = await getSplitBundle(splitId);
  if (!bundle?.receipt) return null;
  const { data } = await supabase.storage
    .from("receipts")
    .createSignedUrl(bundle.receipt.file_path, 3600);
  return data?.signedUrl ?? null;
}
