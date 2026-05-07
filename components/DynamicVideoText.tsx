"use client";

import { useEffect, useState } from "react";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { VideoChapter } from "@/lib/videoChapters";

type DynamicVideoTextProps = {
  chapter: VideoChapter;
};

type TextPhase = "pre-enter" | "enter" | "exit";
const TEXT_SWAP_DELAY_MS = 150;

export function DynamicVideoText({ chapter }: DynamicVideoTextProps) {
  const [displayedChapter, setDisplayedChapter] = useState(chapter);
  const [phase, setPhase] = useState<TextPhase>("enter");

  useEffect(() => {
    let exitFrame = 0;
    let enterFrame = 0;

    if (chapter.id === displayedChapter.id) {
      enterFrame = window.requestAnimationFrame(() => {
        setPhase("enter");
      });

      return () => {
        window.cancelAnimationFrame(enterFrame);
      };
    }

    exitFrame = window.requestAnimationFrame(() => {
      setPhase("exit");
    });

    const timeout = window.setTimeout(() => {
      setDisplayedChapter(chapter);
      setPhase("pre-enter");

      enterFrame = window.requestAnimationFrame(() => {
        setPhase("enter");
      });
    }, TEXT_SWAP_DELAY_MS);

    return () => {
      window.clearTimeout(timeout);

      if (exitFrame) {
        window.cancelAnimationFrame(exitFrame);
      }

      if (enterFrame) {
        window.cancelAnimationFrame(enterFrame);
      }
    };
  }, [chapter, displayedChapter.id]);

  return (
    <div
      className="chapter-copy max-w-[42rem]"
      data-phase={phase}
      aria-live="polite"
    >
      <p className="mb-4 text-xs font-semibold uppercase leading-none tracking-[0.18em] text-champagne sm:text-sm">
        {displayedChapter.eyebrow}
      </p>
      <h1 className="font-display text-[clamp(3rem,12vw,4.5rem)] font-normal leading-[0.98] text-cream md:text-[clamp(4rem,7vw,8.5rem)]">
        {displayedChapter.title}
      </h1>
      <p className="mt-5 max-w-[34rem] text-base leading-7 text-[#eadcc6] sm:mt-6 sm:text-xl sm:leading-8">
        {displayedChapter.body}
      </p>
      {displayedChapter.cta ? (
        <PrimaryButton
          href="#demo"
          aria-label={displayedChapter.cta}
          className="mt-8"
        >
          {displayedChapter.cta}
        </PrimaryButton>
      ) : null}
    </div>
  );
}
