import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";

const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const sans = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://causa.vercel.app"),
  title: "Causa — Know what your agents actually delivered.",
  description:
    "Every agent result is self-reported. Causa checks each claimed outcome where it lands, prices what was real, and tells you what to do next. First statement in 7 days.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Causa — Know what your agents actually delivered.",
    description:
      "Every agent result is self-reported. Causa checks each claimed outcome where it lands, prices what was real, and tells you what to do next. First statement in 7 days.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
