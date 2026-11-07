import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Zenoryx — X-ray vision for codebases", template: "%s · Zenoryx" },
  description:
    "Index any public GitHub repository with AST-aware chunking and vector search, then ask questions and get streamed, cited answers grounded in the actual code.",
  applicationName: "Zenoryx",
  openGraph: {
    title: "Zenoryx — X-ray vision for codebases",
    description: "AST-aware RAG over GitHub repositories. Streamed answers, cited down to the line.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport = {
  themeColor: "#08080a",
  colorScheme: "dark",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrument.variable}`}>
      <body className="min-h-dvh">
        <Providers>
          {children}
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              classNames: {
                toast: "!bg-ink-850 !border !border-[var(--line-strong)] !text-fg !rounded-xl !font-sans",
                description: "!text-fg-muted",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
