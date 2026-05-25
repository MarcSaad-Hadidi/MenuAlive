import { PrimaryButton } from "@/components/PrimaryButton";
import type { VideoChapter } from "@/lib/videoChapters";

type DynamicVideoTextProps = {
  chapter: VideoChapter;
};

export function DynamicVideoText({ chapter }: DynamicVideoTextProps) {
  const primaryHref = chapter.ctaHref ?? "#demo";
  const secondaryHref = chapter.secondaryCtaHref ?? "#demo";

  return (
    <div
      key={chapter.id}
      className="chapter-copy max-w-[40rem] md:max-w-[60rem]"
      data-chapter={chapter.id}
      aria-live="polite"
    >
      <p className="chapter-eyebrow mb-4 text-[0.68rem] font-semibold uppercase leading-none tracking-[0.22em] text-champagne sm:text-xs">
        {chapter.eyebrow}
      </p>
      <h1 className="font-display text-[clamp(2.65rem,11.4vw,4.4rem)] font-normal leading-[0.94] text-cream md:text-[clamp(3.85rem,5.8vw,7.25rem)]">
        {chapter.title}
      </h1>
      <p className="mt-5 max-w-[34rem] text-base leading-7 text-[#eadcc6] sm:mt-6 sm:text-[1.15rem] sm:leading-8">
        {chapter.body}
      </p>
      {chapter.cta ? (
        <div className="mt-8 flex max-w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
          <PrimaryButton href={primaryHref} aria-label={chapter.cta}>
            {chapter.cta}
          </PrimaryButton>
          {chapter.secondaryCta ? (
            <a
              href={secondaryHref}
              aria-label={chapter.secondaryCta}
              className="inline-flex min-h-12 max-w-full items-center justify-center rounded-full border border-white/22 bg-white/6 px-6 py-3 text-center text-base font-semibold leading-tight text-cream transition duration-300 hover:border-champagne/40 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal"
            >
              {chapter.secondaryCta}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
