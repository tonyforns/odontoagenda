import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Full-viewport page chrome: compact header + scrollable content panel. */
export function PageShell({
  eyebrow,
  title,
  subtitle,
  children,
  className,
  contentClassName,
}: Props) {
  return (
    <div
      className={cn(
        "mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col overflow-hidden px-3 py-2 sm:px-4",
        className,
      )}
    >
      <div className="mb-2 flex shrink-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-teal-800/65">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="truncate font-[family-name:var(--font-display)] text-xl leading-tight text-teal-950 sm:text-2xl">
            {title}
          </h1>
        </div>
        {subtitle ? (
          <p className="max-w-md text-xs text-teal-900/55 sm:text-right">
            {subtitle}
          </p>
        ) : null}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden rounded-xl border border-teal-900/10 bg-white/80 shadow-sm backdrop-blur",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
