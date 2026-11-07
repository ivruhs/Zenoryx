"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useMe } from "@/hooks/useMe";
import { cn } from "@/lib/format";

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
        "sticky top-0 z-50 border-b transition-colors duration-300",
        scrolled ? "hairline bg-ink-950/80 backdrop-blur-xl" : "border-transparent",
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6" aria-label="Main">
        <Link href="/" aria-label="Zenoryx home">
          <Logo />
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {[
            ["#how", "How it works"],
            ["#chunking", "Why AST"],
            ["#architecture", "Architecture"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-md px-3 py-1.5 text-sm text-fg-subtle transition-colors hover:text-fg">
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
          <div className="flex items-center gap-1.5">
            <Link href="/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link href="/register" className="btn btn-primary btn-sm">
              Get started
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
