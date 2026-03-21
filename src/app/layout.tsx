import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import CursorTrail from "@/components/CursorTrail";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CTF - JNTUK",
  description: "Live hackathon dashboard with role-based features.",
  icons: {
    icon: "/logo-darkmode.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen antialiased flex flex-col`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <CursorTrail />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}


