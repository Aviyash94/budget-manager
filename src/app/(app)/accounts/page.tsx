import { centsToInput, formatMUR } from "@/lib/money";
import { getDb } from "@/server/db";
import { listAccounts } from "@/server/repos/accounts";
import { requireUser } from "@/server/session";
import { addAccount, editAccount, removeAccount } from "../actions";
import { ConfirmForm } from "../confirm-form";
import { EmptyState, ErrorBanner, Field, inputCls, PageTitle } from "../ui";

export const metadata = { title: "Accounts" };

const TYPES = [
  { value: "bank", label: "Bank", icon: "🏦", tone: "bg-sky-soft text-sky-deep" },
  { value: "cash", label: "Cash", icon: "💵", tone: "bg-mint-soft text-mint-deep" },
  { value: "card", label: "Card", icon: "💳", tone: "bg-peach-soft text-peach-deep" },
] as const;

function TypeSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <select name="type" defaultValue={defaultValue ?? "bank"} className={inputCls}>
      {TYPES.map((t) => (
        <option key={t.value} value={t.value}>
          {t.icon} {t.label}
        </option>
      ))}
    </select>
  );
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { userId } = await requireUser();
  const accounts = await listAccounts(getDb(), userId);

  return (
    <>
      <PageTitle icon="🏦" subtitle="Where your money lives">
        Accounts
      </PageTitle>
      <ErrorBanner message={error} />

      <form action={addAccount} className="card mb-6">
        <h2 className="section-title">New account</h2>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <Field label="Name">
            <input
              name="name"
              required
              maxLength={80}
              placeholder="e.g. MCB current"
              className={inputCls}
            />
          </Field>
          <Field label="Type">
            <TypeSelect />
          </Field>
          <Field label="Opening balance (MUR)">
            <input
              name="openingBalanceCents"
              defaultValue="0.00"
              inputMode="decimal"
              className={inputCls}
            />
          </Field>
          <button className="btn">＋ Add</button>
        </div>
      </form>

      {accounts.length === 0 ? (
        <EmptyState icon="👛" title="No accounts yet">
          Add your bank account or wallet above to start recording transactions.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {accounts.map((a) => {
            const type = TYPES.find((t) => t.value === a.type) ?? TYPES[0];
            return (
              <li key={a.id} className="card">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={`grid size-12 place-items-center rounded-2xl text-2xl ${type.tone}`}
                  >
                    {type.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold">{a.name}</p>
                    <p className="text-xs text-ink-soft">
                      {type.label} · opening {formatMUR(a.openingBalanceCents)}
                    </p>
                  </div>
                  <ConfirmForm
                    action={removeAccount}
                    message={`Delete the account "${a.name}"? Past transactions stay in your history.`}
                  >
                    <input type="hidden" name="id" value={a.id} />
                    <button className="btn-danger">Delete</button>
                  </ConfirmForm>
                </div>

                <details className="group mt-3">
                  <summary className="btn-soft w-fit list-none marker:hidden">✏️ Edit</summary>
                  <form action={editAccount} className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={a.id} />
                    <Field label="Name" className="sm:col-span-2">
                      <input
                        name="name"
                        required
                        defaultValue={a.name}
                        maxLength={80}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Type">
                      <TypeSelect defaultValue={a.type} />
                    </Field>
                    <Field label="Opening balance (MUR)">
                      <input
                        name="openingBalanceCents"
                        defaultValue={centsToInput(a.openingBalanceCents)}
                        inputMode="decimal"
                        className={inputCls}
                      />
                    </Field>
                    <button className="btn w-fit">Save</button>
                  </form>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
