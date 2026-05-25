type SeoTakeawayProps = {
  heading: string;
  text: string;
  variant?: "calm" | "speed" | "confrontation" | "immersion";
};

const variantStyles = {
  calm: "glass-card border-champagne/25",
  speed: "glass-card",
  confrontation: "glass-card border-[#8b3a28]/40 bg-[#120908]/88",
  immersion: "glass-card border-emerald-900/35 bg-[#0a0d0a]/88"
} as const;

export function SeoTakeaway({
  heading,
  text,
  variant = "calm"
}: SeoTakeawayProps) {
  return (
    <aside
      className={`rounded-lg border p-5 sm:p-6 ${variantStyles[variant]}`}
      aria-label={heading}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne/75">
        {heading}
      </p>
      <p className="mt-3 text-base leading-7 text-[#eadcc6] sm:text-lg">{text}</p>
    </aside>
  );
}
