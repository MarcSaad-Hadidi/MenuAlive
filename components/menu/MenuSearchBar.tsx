"use client";

type MenuSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  id?: string;
};

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

export function MenuSearchBar({
  value,
  onChange,
  compact = false,
  id = "menu-demo-search"
}: MenuSearchBarProps) {
  return (
    <div
      className={
        compact
          ? "relative w-full"
          : "relative w-full sm:max-w-xl sm:mx-auto sm:w-full"
      }
    >
      <label htmlFor={id} className="sr-only">
        Rechercher un plat ou un ingrédient
      </label>
      <div
        className={
          compact
            ? "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-champagne/45"
            : "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-champagne/50"
        }
      >
        <SearchIcon className="h-4 w-4" />
      </div>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher un plat ou un ingrédient"
        autoComplete="off"
        spellCheck={false}
        className={
          compact
            ? "glass-input min-h-[42px] w-full rounded-xl py-2.5 pl-10 pr-10 text-[14px] leading-snug ring-0"
            : "glass-input min-h-11 w-full rounded-full py-2.5 pl-10 pr-11 text-sm sm:text-[15px]"
        }
      />
      {value.trim() ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className={
            compact
              ? "absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#8a7b68] transition hover:bg-white/6 hover:text-cream glass-focus-ring"
              : "absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-xs font-medium text-[#8a7b68] transition hover:bg-white/8 hover:text-cream glass-focus-ring"
          }
          aria-label="Effacer la recherche"
        >
          Effacer
        </button>
      ) : null}
    </div>
  );
}
