import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Elasti Dashboard",
  description: "Manage your Q&A bot projects",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Clean layout - just the body with the font class
  // Backgrounds are handled by individual pages or globals.css
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950`}>
        {children}
      </body>
    </html>
  );
}
