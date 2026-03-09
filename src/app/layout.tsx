import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://seated.events"),
  title: "Luma Seated",
  description: "Set up an event page, invite friends and sell tickets. Host a memorable event today.",
  openGraph: {
    title: "Luma Seated",
    description: "Set up an event page, invite friends and sell tickets. Host a memorable event today.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Luma Seated",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Luma Seated",
    description: "Set up an event page, invite friends and sell tickets. Host a memorable event today.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
