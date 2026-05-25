type SeoTakeawayProps = {
  heading: string;
  text: string;
  variant?: "calm" | "speed" | "confrontation" | "immersion";
};

const variantStyles = {
  calm: "border-champagne/25 bg-[#0d0a08]",
  speed: "border-white/12 bg-[#0a0807]",
  confrontation: "border-[#8b3a28]/40 bg-[#120908]",
  immersion: "border-emerald-900/35 bg-[#0a0d0a]"
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
