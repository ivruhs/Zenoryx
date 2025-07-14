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
