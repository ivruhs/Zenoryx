import { Bricolage_Grotesque, Caveat, Instrument_Sans, Space_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap", axes: ["opsz", "wdth"] });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Zenoryx — cut any codebase into answers", template: "%s · Zenoryx" },
  description:
    "Index any public GitHub repository with AST-aware chunking and vector search, then ask questions and get streamed, cited answers grounded in the actual code.",
  applicationName: "Zenoryx",
  openGraph: {
    title: "Zenoryx — cut any codebase into answers",
    description: "AST-aware RAG over GitHub repositories. Streamed answers, cited down to the line.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport = {
  themeColor: "#f2ede3",
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${instrument.variable} ${spaceMono.variable} ${caveat.variable}`}>
      <body className="min-h-dvh">
        <Providers>
          {children}
          <Toaster
            theme="light"
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: "!bg-paper-2 !border-[1.5px] !border-ink !text-ink !rounded-2xl !font-sans !shadow-[4px_4px_0_0_var(--color-ink)]",
                title: "!font-display !font-bold",
                description: "!text-ink-2",
                actionButton: "!bg-pink !text-ink !rounded-full !font-display !font-bold",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
