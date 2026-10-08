import { notFound } from "next/navigation";
import { todayLocal } from "@/lib/month";
import { getDb } from "@/server/db";
import { NotFoundError } from "@/server/errors";
import { listAccounts } from "@/server/repos/accounts";
import { listCategories } from "@/server/repos/categories";
import { getTransaction } from "@/server/repos/transactions";
import { requireUser } from "@/server/session";
import { editTransaction } from "../../../actions";
import { ErrorBanner, PageTitle } from "../../../ui";
import { TransactionForm } from "../../transaction-form";

export default async function EditTransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const { userId } = await requireUser();
  const db = getDb();

  const tx = await getTransaction(db, userId, id).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const [accounts, categories] = await Promise.all([
    listAccounts(db, userId),
    listCategories(db, userId),
  ]);

  return (
    <>
      <PageTitle icon="✏️" subtitle="Fix a mistake or change the details">
        Edit transaction
      </PageTitle>
      <ErrorBanner message={error} />
      <TransactionForm
        action={editTransaction}
        accounts={accounts}
        categories={categories}
        today={todayLocal()}
        tx={tx}
        submitLabel="Save changes"
        cancelHref={`/transactions?month=${tx.date.slice(0, 7)}`}
      />
    </>
  );
}
