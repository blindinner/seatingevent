import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://rendeza.com"),
  title: "Rendeza",
  description: "Set up an event page, invite friends and sell tickets. Host a memorable event today.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Rendeza",
    description: "Set up an event page, invite friends and sell tickets. Host a memorable event today.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Rendeza",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Rendeza",
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
