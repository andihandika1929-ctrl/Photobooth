import "./globals.css";
import type { Metadata } from "next";

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
      </head>
      <body className="min-h-screen bg-cream text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
