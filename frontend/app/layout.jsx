// app/layout.js
import { Providers } from "./providers";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata = {
  title: "Zenoryx | AI Code Assistant",
  description: "Ingest, analyze, and query your GitHub repositories.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-900 bg-slate-50 min-h-screen flex flex-col">
        <Providers>
          {children}
          {/* MOVED HERE: Now toasts will fire on literally every single page */}
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
