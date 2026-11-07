"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useMe } from "@/hooks/useMe";
import { cn } from "@/lib/format";

const LINKS = [
  ["#chunking", "Why cut?"],
  ["#how", "How it works"],
  ["#architecture", "Under the hood"],
];

export function LandingNav() {
  const { data: user } = useMe();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color] duration-300",
        scrolled ? "border-b-[1.5px] border-dashed border-ink/25 bg-paper/85 backdrop-blur-md" : "border-b-[1.5px] border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6" aria-label="Main">
        <Link href="/" aria-label="Zenoryx home" className="transition-transform duration-300 hover:-rotate-3">
          <Logo />
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-full px-3 py-1.5 font-display text-[15px] font-semibold text-ink-2 transition-colors hover:bg-yellow hover:text-ink"
            >
              {label}
            </a>
          ))}
        </div>
        <div className="flex-1" />
        {user ? (
          <Link href="/dashboard" className="btn btn-primary btn-sm">
            Open dashboard <ArrowRight className="size-3.5" />
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link href="/register" className="btn btn-pink btn-sm">
              Get started
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
