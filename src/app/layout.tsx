import type React from "react";
import "@/styles/globals.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { TRPCReactProvider } from "@/trpc/react";
import { Toaster } from "sonner";
import { Banner } from "./banner"; // 👈 Add this import

export const metadata: Metadata = {
  title: "Zenoryx - AI-Powered Code Assistant",
  description: "Intelligent code analysis and project management platform",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Zenoryx - AI-Powered Code Assistant",
    description:
      "Analyze GitHub repos, track commits, and ask AI questions about your codebase.",
    url: "https://zenoryx.vercel.app",
    siteName: "Zenoryx",
    images: [
      {
        url: "/image.png", // since it's in public/, just use the relative path
        width: 1200,
        height: 630,
        alt: "Zenoryx Preview",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zenoryx - AI-Powered Code Assistant",
    description:
      "Intelligent GitHub repo summarization and commit tracking tool.",
    images: ["/image.png"], // same relative path
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${geist.variable}`}>
        <body className="bg-slate-50 pt-10 font-sans antialiased dark:bg-slate-900">
          {" "}
          {/* 👈 Add pt-10 for banner space */}
          <div className="mt-2"></div>
          <Banner />
          <TRPCReactProvider>{children}</TRPCReactProvider>
          {/* 👈 Wrap children with TRPCReactProvider */}
          {/* Helps in making backend API calls */}
          {/* autocomplete + type safety in frontend */}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: "12px",
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
