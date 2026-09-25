/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HaloLuna — Korean Aesthetic Photobooth Studio (gethaloluna.com)",
  description: "HaloLuna (gethaloluna.com) — Capture, style, and print Korean aesthetic photo strips and 9:16 lockscreen wallpapers.",
  keywords: ["haloluna", "photobooth", "korean photobooth", "photo strip", "lockscreen wallpaper", "gethaloluna"],
  authors: [{ name: "HaloLuna Team" }],
  openGraph: {
    title: "HaloLuna — Korean Aesthetic Photobooth Studio",
    description: "Capture 6 studio shots, pick your 4 best, style with Korean aesthetic frames, and export high-res strips & wallpapers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..700;1,6..96,400..700&family=Caveat:wght@700&family=DynaPuff:wght@600;700;800&family=Inter:wght@300;400;500;600;700&family=Pacifico&family=Pinyon+Script&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-cream text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
