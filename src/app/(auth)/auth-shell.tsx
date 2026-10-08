/** Shared frame for the small centred auth pages (title, subtitle, content). */
export function AuthShell({
  icon = "💸",
  title,
  subtitle,
  children,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <span
          aria-hidden
          className="mx-auto grid size-16 place-items-center rounded-3xl bg-pink text-3xl shadow-sm"
        >
          {icon}
        </span>
        <h1 className="mt-4 text-3xl font-black">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {children}
    </main>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-2xl bg-mint-soft px-4 py-3 text-sm font-bold text-mint-deep ring-1 ring-mint"
    >
      ✅ {children}
    </p>
  );
}

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-2xl bg-pink-soft px-4 py-3 text-sm font-bold text-pink-deep ring-1 ring-pink"
    >
      ⚠️ {children}
    </p>
  );
}
