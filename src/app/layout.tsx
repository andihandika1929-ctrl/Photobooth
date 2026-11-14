import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HaloLuna — Korean Aesthetic Photobooth Studio (gethaloluna.com)",
  description: "HaloLuna (gethaloluna.com) — Capture, style, and print Korean aesthetic photo strips and 9:16 lockscreen wallpapers.",
  keywords: ["haloluna", "photobooth", "korean photobooth", "photo strip", "lockscreen wallpaper", "gethaloluna"],
  authors: [{ name: "HaloLuna Team" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  openGraph: {
    title: "HaloLuna — Korean Aesthetic Photobooth Studio",
    description: "Capture 6 studio shots, pick your 4 best, style with Korean aesthetic frames, and export high-res strips & wallpapers.",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1024,
        height: 1024,
        alt: "HaloLuna Logo",
      },
    ],
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" sizes="512x512" />
        <link rel="apple-touch-icon" href="/apple-icon.png" sizes="180x180" />
      </head>
      <body className="min-h-screen bg-cream text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
