"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  addExpenseAction,
  deleteExpenseAction,
  deleteFeeAction,
  finalizeSplitAction,
  fetchSplitBundleAction,
  markSettlementPaidAction,
  saveContributionsAction,
  saveFeeAction,
  saveReceiptAction,
  updateExpenseAction,
} from "@/actions/splits";
import { getReceiptUrlAction } from "@/actions/receipt";
import { ExpenseForm } from "@/components/splits/ExpenseForm";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { useSplitRealtime } from "@/hooks/useSplitRealtime";
import { describeActivity } from "@/lib/activity";
import { checkReceipt } from "@/lib/calc/engine";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatPeso } from "@/lib/money";
import { calculateBundle, money } from "@/lib/split/map";
import { createClient } from "@/lib/supabase/client";
import type { Expense, SplitBundle } from "@/types/database";

type Tab = "expenses" | "people" | "bill" | "activity";

export function SplitWorkspace({
  initial,
  currentUserId,
}: {
  initial: SplitBundle;
  currentUserId: string;
}) {
  const [bundle, setBundle] = useState(initial);
  const [tab, setTab] = useState<Tab>("expenses");
  const [sheet, setSheet] = useState<"add" | "edit" | "finalize" | null>(null);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const calc = useMemo(() => calculateBundle(bundle), [bundle]);
  const me = calc.members.find((member) => member.userId === currentUserId);
  const isCreator = bundle.split.creator_id === currentUserId;
  const isOpen = bundle.split.status === "open";
  const creatorName =
    bundle.participants.find((item) => item.user_id === bundle.split.creator_id)
      ?.profile.full_name ?? "Creator";

  const refresh = useCallback(async () => {
    const result = await fetchSplitBundleAction(bundle.split.id);
    if (result.ok) setBundle(result.data);
  }, [bundle.split.id]);

  useSplitRealtime(
    bundle.split.id,
    useCallback(() => {
      setLive(true);
      void refresh();
    }, [refresh]),
  );

  const receiptCheck = bundle.receipt
    ? checkReceipt(money(bundle.receipt.receipt_total_centavos), calc.grandTotal)
    : null;

  function profileName(userId: string) {
    return (
      bundle.participants.find((item) => item.user_id === userId)?.profile
        .full_name ?? "Someone"
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-[#fff8f8] md:min-h-0 md:rounded-[32px]">
      <header className="sticky top-0 z-20 bg-[#fff8f8]/95 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href={`/groups/${bundle.group.id}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg"
            aria-label="Back to group"
          >
            ←
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-splits-muted">{bundle.group.name}</p>
            <h1 className="truncate text-xl font-extrabold">
              {bundle.split.emoji} {bundle.split.name}
            </h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              isOpen ? "bg-splits-soft text-splits-red" : "bg-[#111] text-white"
            }`}
          >
            {isOpen ? "Open" : "🔒 Finalized"}
          </span>
        </div>
        {!live ? (
          <p className="mt-2 text-xs text-splits-muted">
            Live updates paused. Pull to refresh if something looks stale.
          </p>
        ) : null}
      </header>

      <section className="px-4">
        <div className="rounded-[28px] bg-splits-red px-5 py-5 text-white shadow-[0_16px_40px_rgba(220,31,46,0.25)]">
          <p className="text-sm text-white/80">Current total</p>
          <p className="text-4xl font-extrabold tracking-tight">
            {formatPeso(calc.grandTotal, { exact: true })}
          </p>
          <div className="mt-3 flex justify-between text-sm text-white/85">
            <span>{calc.participantCount} members</span>
            <span>{calc.expenseCount} expenses</span>
            <span>You: {formatPeso(me?.totalOwed ?? 0, { exact: true })}</span>
          </div>
        </div>
      </section>

      {bundle.split.status === "finalized" && bundle.split.finalized_at ? (
        <p className="px-5 pt-3 text-sm text-splits-muted">
          🔒 This Split was finalized by {profileName(bundle.split.finalized_by ?? "")} on{" "}
          {formatDateTime(bundle.split.finalized_at)}.
        </p>
      ) : (
        <p className="px-5 pt-3 text-sm text-splits-muted">
          {formatDate(bundle.split.occurred_on)} · created by {creatorName}
        </p>
      )}

      <div className="mt-4 grid grid-cols-4 px-2">
        {(["expenses", "people", "bill", "activity"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`min-h-11 rounded-full text-sm font-semibold capitalize ${
              tab === item ? "bg-white text-splits-red shadow-sm" : "text-splits-muted"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 py-4 pb-32">
        {tab === "expenses" ? (
          <ExpensesTab
            bundle={bundle}
            currentUserId={currentUserId}
            isCreator={isCreator}
            isOpen={isOpen}
            onEdit={(expense) => {
              setEditing(expense);
              setSheet("edit");
            }}
            onDelete={async (id) => {
              const result = await deleteExpenseAction(bundle.split.id, id);
              if (!result.ok) setMessage(result.error);
              await refresh();
            }}
          />
        ) : null}
        {tab === "people" ? (
          <PeopleTab
            bundle={bundle}
            currentUserId={currentUserId}
            onRefresh={refresh}
          />
        ) : null}
        {tab === "bill" ? (
          <BillTab
            bundle={bundle}
            isCreator={isCreator}
            isOpen={isOpen}
            receiptCheck={receiptCheck}
            onRefresh={refresh}
            onFinalize={() => setSheet("finalize")}
            setMessage={setMessage}
          />
        ) : null}
        {tab === "activity" ? <ActivityTab bundle={bundle} /> : null}
        {message ? <p className="mt-3 text-sm text-splits-red">{message}</p> : null}
      </div>

      {isOpen ? (
        <div className="sticky bottom-0 z-20 bg-gradient-to-t from-[#fff8f8] via-[#fff8f8] to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <Button type="button" onClick={() => setSheet("add")}>
            Add Expense
          </Button>
        </div>
      ) : null}

      <Sheet
        open={sheet === "add"}
        title="Add expense"
        onClose={() => setSheet(null)}
      >
        <ExpenseForm
          currentUserId={currentUserId}
          isCreator={isCreator}
          participants={bundle.participants}
          submitLabel="Add to Split"
          onSubmit={async (input) => {
            const result = await addExpenseAction(bundle.split.id, input);
            if (!result.ok) return result.error;
            setSheet(null);
            await refresh();
            return null;
          }}
        />
      </Sheet>

      <Sheet
        open={sheet === "edit" && Boolean(editing)}
        title="Edit expense"
        onClose={() => {
          setSheet(null);
          setEditing(null);
        }}
      >
        {editing ? (
          <ExpenseForm
            currentUserId={currentUserId}
            isCreator={isCreator}
            participants={bundle.participants}
            initial={{
              name: editing.name,
              amount: String(editing.amount_centavos / 100),
              type: editing.type,
              participantIds: editing.participants?.map((item) => item.user_id) ?? [],
            }}
            submitLabel="Save changes"
            onSubmit={async (input) => {
              const result = await updateExpenseAction(
                bundle.split.id,
                editing.id,
                input,
              );
              if (!result.ok) return result.error;
              setSheet(null);
              setEditing(null);
              await refresh();
              return null;
            }}
          />
        ) : null}
      </Sheet>

      <Sheet
        open={sheet === "finalize"}
        title="Finalize this Split?"
        onClose={() => setSheet(null)}
      >
        <p className="text-sm leading-6 text-splits-muted">
          Once finalized, expenses and participant assignments can no longer be
          changed. Make sure the receipt and expenses are correct.
        </p>
        <div className="mt-5 grid gap-2">
          <Button
            type="button"
            onClick={async () => {
              const result = await finalizeSplitAction(bundle.split.id);
              if (!result.ok) {
                setMessage(result.error);
                setSheet(null);
                return;
              }
              setSheet(null);
              await refresh();
              setTab("people");
            }}
          >
            Finalize Split
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSheet(null)}>
            Cancel
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function ExpensesTab({
  bundle,
  currentUserId,
  isCreator,
  isOpen,
  onEdit,
  onDelete,
}: {
  bundle: SplitBundle;
  currentUserId: string;
  isCreator: boolean;
  isOpen: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}) {
  if (bundle.expenses.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet."
        body="Add your first expense. Individual orders stay with you. Shared plates are split equally."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {bundle.expenses.map((expense) => {
        const names = expense.participants
          .map(
            (item) =>
              bundle.participants.find((p) => p.user_id === item.user_id)?.profile
                .full_name ?? "Friend",
          )
          .map((name) => name.split(" ")[0]);
        const canEdit =
          isOpen && (isCreator || expense.created_by === currentUserId);
        const each =
          expense.type === "shared" && expense.participants.length
            ? Math.round(expense.amount_centavos / expense.participants.length)
            : expense.amount_centavos;

        return (
          <li key={expense.id} className="rounded-[24px] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{expense.name}</p>
                <p className="text-sm text-splits-muted">
                  {expense.type === "shared"
                    ? `Shared by ${expense.participants.length} · ${formatPeso(each, { exact: true })} each`
                    : names[0] ?? "Unassigned"}
                </p>
              </div>
              <p className="font-extrabold text-splits-red">
                {formatPeso(expense.amount_centavos)}
              </p>
            </div>
            {canEdit ? (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="text-sm font-semibold text-splits-red"
                  onClick={() => onEdit(expense)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-sm font-semibold text-splits-muted"
                  onClick={() => onDelete(expense.id)}
                >
                  Delete
                </button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function PeopleTab({
  bundle,
  currentUserId,
  onRefresh,
}: {
  bundle: SplitBundle;
  currentUserId: string;
  onRefresh: () => Promise<void>;
}) {
  const calc = calculateBundle(bundle);

  return (
    <div className="space-y-4">
      {bundle.split.status === "finalized" ? (
        <section className="rounded-[24px] bg-white p-4">
          <h2 className="font-bold">Settlement</h2>
          {bundle.settlements.length === 0 ? (
            <p className="mt-2 text-sm text-splits-muted">
              Nobody owes anyone else. Nice.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {bundle.settlements.map((transfer) => {
                const from = bundle.participants.find(
                  (item) => item.user_id === transfer.from_user_id,
                );
                const to = bundle.participants.find(
                  (item) => item.user_id === transfer.to_user_id,
                );
                const mine =
                  transfer.from_user_id === currentUserId ||
                  transfer.to_user_id === currentUserId;
                return (
                  <li key={transfer.id} className="rounded-2xl bg-splits-soft p-3">
                    <p className="font-semibold">
                      {from?.profile.full_name.split(" ")[0]} →{" "}
                      {to?.profile.full_name.split(" ")[0]}
                    </p>
                    <p className="text-sm">
                      {formatPeso(transfer.amount_centavos)} ·{" "}
                      {transfer.status === "paid" ? "🟢 Paid" : "🔴 Unpaid"}
                    </p>
                    {mine && transfer.status !== "paid" ? (
                      <div className="mt-2 grid gap-2">
                        <Button
                          type="button"
                          onClick={async () => {
                            const result = await markSettlementPaidAction(
                              bundle.split.id,
                              transfer.id,
                            );
                            if (result.ok) await onRefresh();
                          }}
                        >
                          Mark as paid
                        </Button>
                        <Button type="button" variant="secondary" disabled>
                          Pay with GCash · soon
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <ul className="space-y-3">
        {calc.members.map((member) => {
          const paidOutgoing = bundle.settlements.filter(
            (item) =>
              item.from_user_id === member.userId && item.status === "paid",
          );
          const unpaidOutgoing = bundle.settlements.filter(
            (item) =>
              item.from_user_id === member.userId && item.status !== "paid",
          );
          const status =
            bundle.split.status !== "finalized"
              ? null
              : member.netCentavos >= 0
                ? "Covered"
                : unpaidOutgoing.length === 0
                  ? "🟢 Paid"
                  : "🔴 Unpaid";

          return (
            <li key={member.userId} className="rounded-[24px] bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <Avatar name={member.name} id={member.userId} />
                  <span>
                    <span className="block font-bold">
                      {member.name}
                      {member.userId === currentUserId ? " · you" : ""}
                    </span>
                    {status ? (
                      <span className="text-xs font-semibold text-splits-muted">
                        {status}
                      </span>
                    ) : null}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-extrabold text-splits-red">
                    {formatPeso(member.totalOwed, { exact: true })}
                  </span>
                  {member.totalOwed !== member.suggestedPayment ? (
                    <span className="text-xs text-splits-muted">
                      suggested {formatPeso(member.suggestedPayment)}
                    </span>
                  ) : null}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-splits-muted">
                {member.lines.map((line) => (
                  <li key={`${line.label}-${line.detail}`} className="flex justify-between">
                    <span>
                      {line.label}
                      <span className="block text-xs">{line.detail}</span>
                    </span>
                    <span>{formatPeso(line.amountCentavos, { exact: true })}</span>
                  </li>
                ))}
              </ul>
              {paidOutgoing.length ? (
                <p className="mt-2 text-xs text-splits-muted">
                  {paidOutgoing.length} settlement{paidOutgoing.length === 1 ? "" : "s"} marked paid.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function BillTab({
  bundle,
  isCreator,
  isOpen,
  receiptCheck,
  onRefresh,
  onFinalize,
  setMessage,
}: {
  bundle: SplitBundle;
  isCreator: boolean;
  isOpen: boolean;
  receiptCheck: ReturnType<typeof checkReceipt> | null;
  onRefresh: () => Promise<void>;
  onFinalize: () => void;
  setMessage: (value: string | null) => void;
}) {
  const calc = calculateBundle(bundle);
  const [receiptTotal, setReceiptTotal] = useState(
    bundle.receipt
      ? String(bundle.receipt.receipt_total_centavos / 100)
      : "",
  );
  const [uploading, setUploading] = useState(false);
  const [feeName, setFeeName] = useState("Service Charge");
  const [feeAmount, setFeeAmount] = useState("");
  const [feeType, setFeeType] = useState<"tax" | "service" | "other">("service");
  const [payers, setPayers] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      bundle.participants.map((item) => [
        item.user_id,
        String(
          (bundle.contributions.find((row) => row.user_id === item.user_id)
            ?.amount_centavos ?? 0) / 100 || "",
        ),
      ]),
    ),
  );

  async function uploadReceipt(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${bundle.split.id}/${crypto.randomUUID()}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("receipts").upload(path, file, {
        upsert: true,
      });
      if (error) throw error;
      const result = await saveReceiptAction(bundle.split.id, {
        filePath: path,
        total: receiptTotal || "0",
      });
      if (!result.ok) setMessage(result.error);
      await onRefresh();
    } catch {
      setMessage("Could not upload the receipt. Try a JPG or PNG under 10MB.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] bg-white p-4">
        <h2 className="font-bold">Why this total?</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Expenses</dt>
            <dd className="font-semibold">{formatPeso(calc.expenseSubtotal, { exact: true })}</dd>
          </div>
          {calc.fees.map((fee) => (
            <div key={fee.feeId} className="flex justify-between">
              <dt>
                {fee.name}
                <span className="block text-xs text-splits-muted">{fee.explanation}</span>
              </dt>
              <dd className="font-semibold">{formatPeso(fee.totalCentavos)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-splits-line pt-2 text-base">
            <dt className="font-bold">Total</dt>
            <dd className="font-extrabold text-splits-red">
              {formatPeso(calc.grandTotal, { exact: true })}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-[24px] bg-white p-4">
        <h2 className="font-bold">Receipt</h2>
        {bundle.receipt ? (
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-splits-red"
            onClick={async () => {
              const url = await getReceiptUrlAction(bundle.split.id);
              if (url) window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            View receipt image
          </button>
        ) : (
          <p className="mt-1 text-sm text-splits-muted">No receipt uploaded yet.</p>
        )}
        {receiptCheck ? (
          <p className="mt-2 text-sm">
            {receiptCheck.matches
              ? "✅ Receipt total matches Split total"
              : `⚠️ Receipt total doesn't match. Difference: ${formatPeso(Math.abs(receiptCheck.difference), { exact: true })}`}
          </p>
        ) : null}
        {isCreator && isOpen ? (
          <div className="mt-3 space-y-3">
            <TextField
              label="Receipt total"
              value={receiptTotal}
              onChange={(event) => setReceiptTotal(event.target.value)}
              placeholder="3046"
            />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Upload image</span>
              <input
                type="file"
                accept="image/*"
                className="text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadReceipt(file);
                }}
              />
            </label>
            {bundle.receipt ? (
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                onClick={async () => {
                  const result = await saveReceiptAction(bundle.split.id, {
                    filePath: bundle.receipt!.file_path,
                    total: receiptTotal,
                  });
                  if (!result.ok) setMessage(result.error);
                  await onRefresh();
                }}
              >
                Update receipt total
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>

      {isCreator && isOpen ? (
        <section className="rounded-[24px] bg-white p-4">
          <h2 className="font-bold">Fees</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {bundle.fees.map((fee) => (
              <li key={fee.id} className="flex items-center justify-between">
                <span>
                  {fee.name} · {formatPeso(fee.amount_centavos)}
                </span>
                <button
                  type="button"
                  className="font-semibold text-splits-muted"
                  onClick={async () => {
                    await deleteFeeAction(bundle.split.id, fee.id);
                    await onRefresh();
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-2">
            <TextField label="Fee name" value={feeName} onChange={(e) => setFeeName(e.target.value)} />
            <TextField
              label="Amount"
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              placeholder="486"
            />
            <div className="flex gap-2">
              {(["service", "tax", "other"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFeeType(value)}
                  className={`min-h-10 flex-1 rounded-full text-sm font-semibold capitalize ${
                    feeType === value ? "bg-splits-red text-white" : "bg-splits-soft text-splits-red"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                const result = await saveFeeAction(bundle.split.id, {
                  name: feeName,
                  type: feeType,
                  amount: feeAmount,
                });
                if (!result.ok) setMessage(result.error);
                setFeeAmount("");
                await onRefresh();
              }}
            >
              Add fee
            </Button>
          </div>
        </section>
      ) : null}

      {isCreator && isOpen ? (
        <section className="rounded-[24px] bg-white p-4">
          <h2 className="font-bold">Who paid the restaurant?</h2>
          <p className="mt-1 text-sm text-splits-muted">
            This is not assumed to be the creator. Add one or more payers until it
            matches {formatPeso(calc.grandTotal)}.
          </p>
          <div className="mt-3 space-y-2">
            {bundle.participants.map((participant) => (
              <TextField
                key={participant.user_id}
                label={participant.profile.full_name}
                value={payers[participant.user_id] ?? ""}
                onChange={(event) =>
                  setPayers((current) => ({
                    ...current,
                    [participant.user_id]: event.target.value,
                  }))
                }
                placeholder="0"
              />
            ))}
          </div>
          <Button
            type="button"
            className="mt-3"
            variant="secondary"
            onClick={async () => {
              const result = await saveContributionsAction(
                bundle.split.id,
                Object.entries(payers).map(([userId, amount]) => ({
                  userId,
                  amount,
                })),
              );
              if (!result.ok) setMessage(result.error);
              await onRefresh();
            }}
          >
            Save payers
          </Button>
          <p className="mt-2 text-sm text-splits-muted">
            Recorded: {formatPeso(calc.contributionTotal)} of {formatPeso(calc.grandTotal)}
          </p>
        </section>
      ) : (
        <section className="rounded-[24px] bg-white p-4">
          <h2 className="font-bold">Who paid the restaurant?</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {bundle.contributions.length === 0 ? (
              <li className="text-splits-muted">Not recorded yet.</li>
            ) : (
              bundle.contributions.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>
                    {
                      bundle.participants.find((p) => p.user_id === item.user_id)
                        ?.profile.full_name
                    }
                  </span>
                  <span>{formatPeso(item.amount_centavos)}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {isCreator && isOpen ? (
        <section className="rounded-[24px] bg-white p-4">
          <h2 className="font-bold">Review</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              {calc.unassignedExpenseIds.length === 0
                ? "✅ All expenses assigned"
                : "⚠️ Some expenses are unassigned"}
            </li>
            <li>
              {bundle.receipt ? "✅ Receipt uploaded" : "Receipt not uploaded yet"}
            </li>
            <li>
              {receiptCheck?.matches
                ? "✅ Totals match"
                : bundle.receipt
                  ? "⚠️ Receipt and Split totals differ"
                  : "Add a receipt total to double-check the bill"}
            </li>
            <li>
              {calc.contributionTotal === calc.grandTotal
                ? "✅ Payers cover the bill"
                : "⚠️ Who paid must equal the Split total"}
            </li>
          </ul>
          <Button type="button" className="mt-4" onClick={onFinalize}>
            Finalize Split
          </Button>
        </section>
      ) : null}
    </div>
  );
}

function ActivityTab({ bundle }: { bundle: SplitBundle }) {
  if (bundle.activity.length === 0) {
    return (
      <EmptyState
        title="No activity yet."
        body="When people add orders, upload a receipt, or finalize, it shows up here."
      />
    );
  }

  return (
    <ol className="space-y-3">
      {bundle.activity.map((item) => (
        <li key={item.id} className="rounded-[24px] bg-white p-4">
          <p className="font-medium">
            {describeActivity(
              item.action,
              item.actor?.full_name ?? "Someone",
              item.new_data,
            )}
          </p>
          <p className="text-xs text-splits-muted">{formatDateTime(item.created_at)}</p>
        </li>
      ))}
    </ol>
  );
}
