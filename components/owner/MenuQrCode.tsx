"use client";

import { useEffect, useMemo, useState } from "react";

type MenuQrCodeProps = {
  menuUrl: string;
  restaurantName: string;
  className?: string;
};

function qrFileSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function MenuQrCode({
  menuUrl,
  restaurantName,
  className = ""
}: MenuQrCodeProps) {
  const [qrState, setQrState] = useState({ url: "", svgMarkup: "" });
  const [status, setStatus] = useState<"idle" | "copied" | "downloaded" | "error">(
    "idle"
  );
  const svgMarkup = qrState.url === menuUrl ? qrState.svgMarkup : "";
  const fileName = useMemo(
    () => `vistaire-menu-${qrFileSlug(restaurantName) || "restaurant"}.svg`,
    [restaurantName]
  );

  useEffect(() => {
    let isCurrent = true;

    async function renderQr() {
      try {
        const QRCode = await import("qrcode");
        const svg = await QRCode.toString(menuUrl, {
          type: "svg",
          errorCorrectionLevel: "M",
          margin: 3,
          width: 236,
          color: {
            dark: "#080706",
            light: "#fff8ea"
          }
        });

        if (isCurrent) {
          setQrState({ url: menuUrl, svgMarkup: svg });
          setStatus("idle");
        }
      } catch {
        if (isCurrent) setStatus("error");
      }
    }

    void renderQr();

    return () => {
      isCurrent = false;
    };
  }, [menuUrl]);

  async function copyMenuUrl() {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  function downloadQr() {
    if (!svgMarkup) return;

    const blob = new Blob([svgMarkup], {
      type: "image/svg+xml;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("downloaded");
  }

  return (
    <div className={className}>
      <div className="rounded-[10px] border border-champagne/30 bg-[#fff8ea] p-3 text-charcoal shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <div
          className="mx-auto flex aspect-square w-full max-w-[236px] items-center justify-center overflow-hidden rounded-[6px] bg-[#fff8ea]"
          aria-label={`Menu QR pour ${restaurantName}`}
          role="img"
        >
          {svgMarkup ? (
            <span
              className="block w-full [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          ) : (
            <span className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-charcoal/60">
              Menu QR
            </span>
          )}
        </div>
      </div>

      <p className="mt-3 break-all text-xs leading-relaxed text-[#a99a86]">
        {menuUrl}
      </p>

      <div className="mt-4 grid gap-2 min-[430px]:grid-cols-2">
        <button
          type="button"
          onClick={copyMenuUrl}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/14 px-4 text-sm font-semibold text-cream transition hover:border-champagne/35 hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne"
        >
          Copier l&apos;URL
        </button>
        <button
          type="button"
          onClick={downloadQr}
          disabled={!svgMarkup}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-champagne/45 bg-champagne/[0.12] px-4 text-sm font-semibold text-cream transition hover:border-champagne/60 hover:bg-champagne/[0.18] focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne disabled:cursor-wait disabled:opacity-55"
        >
          Telecharger QR
        </button>
      </div>

      <p
        aria-live="polite"
        className="mt-3 min-h-5 text-xs leading-5 text-[#d9c59f]"
      >
        {status === "copied"
          ? "URL copiee dans le presse-papiers."
          : status === "downloaded"
            ? "QR SVG telecharge."
            : status === "error"
              ? "Action indisponible dans ce navigateur."
              : ""}
      </p>
    </div>
  );
}
