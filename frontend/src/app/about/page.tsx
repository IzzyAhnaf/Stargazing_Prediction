"use client";

import React from "react";
import Link from "next/link";
import { Telescope, ArrowLeft, Languages } from "lucide-react";
import { I18nProvider, useI18n, Lang } from "@/lib/i18n";

const DISPLAY = "font-[family-name:var(--font-display)]";

// Team credits. Names/NIMs are proper nouns, so they're kept as-is in both
// languages rather than routed through the i18n dictionary.
const TEAM_MEMBERS = [
  { name: "Izzy Ahnaf", nim: "J0404241153" },
  { name: "Bintang Afdhal Ramadani", nim: "J0404241111" },
  { name: "Kesya Khoerunisa Putri Suryaman", nim: "J0404241058" },
];

export default function AboutPage() {
  return (
    <I18nProvider>
      <AboutPageInner />
    </I18nProvider>
  );
}

function AboutPageInner() {
  const { t, lang, setLang } = useI18n();

  return (
    <main
      className="flex min-h-screen flex-col items-center bg-[#0b0f1e] px-4 pb-16 pt-5 text-[#e9e6dc] sm:px-6 lg:px-10"
      suppressHydrationWarning
    >
      <div className="flex w-full max-w-3xl flex-col gap-10">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-[#232b47] pb-4">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 text-sm font-medium text-[#e9e6dc] transition-colors hover:text-[#9db8ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9db8ff]"
          >
            <Telescope className="h-4 w-4 shrink-0 text-[#9097ad]" aria-hidden />
            <span className="truncate">{t("header.title")}</span>
          </Link>

          <div className="flex shrink-0 items-center gap-3 text-sm">
            <div
              role="group"
              aria-label={t("header.languageLabel")}
              className="flex items-center gap-0.5 rounded-md border border-[#232b47] bg-[#11172b] p-0.5 text-xs"
            >
              <Languages className="ml-1.5 h-3.5 w-3.5 shrink-0 text-[#9097ad]" aria-hidden />
              {(["en", "id"] as Lang[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                  className={`rounded-[4px] px-2 py-1 uppercase transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9db8ff] ${
                    lang === code ? "bg-[#232b47] text-[#e9e6dc]" : "text-[#9097ad] hover:text-[#e9e6dc]"
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Back link */}
        <Link
          href="/"
          className="flex w-fit items-center gap-1.5 text-sm text-[#9097ad] transition-colors hover:text-[#e9e6dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9db8ff]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          {t("nav.backToForecast")}
        </Link>

        {/* Title + intro */}
        <section className="flex flex-col gap-3">
          <h1 className={`${DISPLAY} text-4xl tracking-tight sm:text-5xl`}>{t("about.title")}</h1>
          <p className="max-w-[65ch] text-base leading-relaxed text-[#b3b0a6]">{t("about.intro")}</p>
        </section>

        {/* Sections */}
        <div className="flex flex-col gap-6">
          <section className="rounded-md border border-[#232b47] bg-[#11172b] p-5">
            <h2 className={`${DISPLAY} text-lg`}>{t("about.howItWorksTitle")}</h2>
            <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-[#b3b0a6]">
              {t("about.howItWorksBody")}
            </p>
          </section>

          <section className="rounded-md border border-[#232b47] bg-[#11172b] p-5">
            <h2 className={`${DISPLAY} text-lg`}>{t("about.dataSourcesTitle")}</h2>
            <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-[#b3b0a6]">
              {t("about.dataSourcesBody")}
            </p>
          </section>

          <section className="rounded-md border border-[#232b47] bg-[#11172b] p-5">
            <h2 className={`${DISPLAY} text-lg`}>{t("about.stackTitle")}</h2>
            <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-[#b3b0a6]">{t("about.stackBody")}</p>
          </section>

          <section className="rounded-md border border-[#232b47] bg-[#11172b] p-5">
            <h2 className={`${DISPLAY} text-lg`}>{t("about.authorTitle")}</h2>
            <ul className="mt-3 flex flex-col gap-3">
              {TEAM_MEMBERS.map((member) => (
                <li
                  key={member.nim}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-t border-[#232b47] pt-3 first:border-t-0 first:pt-0"
                >
                  <span className="text-sm text-[#e9e6dc]">{member.name}</span>
                  <span className="text-xs tabular-nums text-[#9097ad]">
                    {t("about.nim")} {member.nim}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-md border border-amber-500/30 bg-amber-500/5 p-5">
            <h2 className={`${DISPLAY} text-lg text-amber-300`}>{t("about.disclaimerTitle")}</h2>
            <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-amber-200/80">
              {t("about.disclaimerBody")}
            </p>
          </section>
        </div>

        <footer className="mt-4 border-t border-[#232b47] pt-5 text-xs leading-relaxed text-[#9097ad]">
          {t("footer")}
        </footer>
      </div>
    </main>
  );
}
