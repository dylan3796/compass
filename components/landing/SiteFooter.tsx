import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="rule border-t py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-baseline sm:justify-between">
        <Link href="/" className="wordmark text-3xl">
          Causa.
        </Link>
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
          <a
            href="mailto:hello@causa.co"
            className="flex min-h-[44px] items-center underline-offset-4 hover:underline sm:min-h-0"
          >
            hello@causa.co
          </a>
          <Link
            href="/demo"
            className="flex min-h-[44px] items-center underline-offset-4 hover:underline sm:min-h-0"
          >
            Product
          </Link>
          <Link
            href="/workbench"
            className="flex min-h-[44px] items-center underline-offset-4 hover:underline sm:min-h-0"
          >
            Workbench
          </Link>
          <Link
            href="/company"
            className="flex min-h-[44px] items-center underline-offset-4 hover:underline sm:min-h-0"
          >
            Company
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4">
        <p className="mt-6 text-xs text-ink/60">
          Causa provides operational outcome verification. Not accounting, audit, or assurance
          services.
        </p>
      </div>
    </footer>
  );
}
