import { getDb } from "@/server/db";
import { listCategories } from "@/server/repos/categories";
import { requireUser } from "@/server/session";
import { addCategory, editCategory, removeCategory } from "../actions";
import { ConfirmForm } from "../confirm-form";
import { ErrorBanner, Field, inputCls, PageTitle, toneFor } from "../ui";

export const metadata = { title: "Categories" };

const KINDS = [
  {
    kind: "expense",
    title: "Expense categories",
    icon: "🛍️",
    empty: "Things you spend on, like Groceries or Rent.",
  },
  {
    kind: "income",
    title: "Income categories",
    icon: "💰",
    empty: "Where money comes from, like Salary.",
  },
] as const;

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { userId } = await requireUser();
  const categories = await listCategories(getDb(), userId);

  return (
    <>
      <PageTitle icon="🏷️" subtitle="Group your money so you can see where it goes">
        Categories
      </PageTitle>
      <ErrorBanner message={error} />

      <form action={addCategory} className="card mb-6">
        <h2 className="section-title">New category</h2>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          <Field label="Name">
            <input
              name="name"
              required
              maxLength={80}
              placeholder="e.g. Groceries"
              className={inputCls}
            />
          </Field>
          <Field label="Kind">
            <select name="kind" className={inputCls}>
              <option value="expense">🛍️ Expense</option>
              <option value="income">💰 Income</option>
            </select>
          </Field>
          <button className="btn">＋ Add</button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {KINDS.map(({ kind, title, icon, empty }) => {
          const rows = categories.filter((c) => c.kind === kind);
          return (
            <section key={kind} className="card">
              <h2 className="section-title flex items-center gap-2">
                <span aria-hidden>{icon}</span>
                {title}
              </h2>
              {rows.length === 0 ? (
                <p className="text-sm text-ink-soft">{empty}</p>
              ) : (
                <ul className="space-y-2">
                  {rows.map((c) => {
                    const tone = toneFor(c.id);
                    return (
                      <li
                        key={c.id}
                        className={`flex flex-wrap items-center gap-2 rounded-2xl p-2 ${tone.bg}`}
                      >
                        <span aria-hidden className={`ml-1 size-3 rounded-full ${tone.dot}`} />
                        <form
                          action={editCategory}
                          className="flex min-w-0 flex-1 items-center gap-2"
                        >
                          <input type="hidden" name="id" value={c.id} />
                          <input
                            name="name"
                            defaultValue={c.name}
                            required
                            maxLength={80}
                            aria-label={`Name of ${c.name}`}
                            className="input min-w-0 flex-1 bg-white/80"
                          />
                          <button className="btn-soft bg-white/80">Rename</button>
                        </form>
                        <ConfirmForm
                          action={removeCategory}
                          message={`Delete "${c.name}"? Past months keep their numbers.`}
                        >
                          <input type="hidden" name="id" value={c.id} />
                          <button className="btn-danger">Delete</button>
                        </ConfirmForm>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
