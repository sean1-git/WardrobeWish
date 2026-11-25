import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WardrobeWish — Your style, all in one place.",
  description: "Your style, all in one place. Sign in to WardrobeWish.",
  icons: {
    icon: "/ww-monogram.svg",
    shortcut: "/ww-monogram.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
