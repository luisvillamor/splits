import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { RememberSession } from "@/components/auth/RememberSession";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "splits.",
    template: "%s · splits.",
  },
  description:
    "Collaborative expense splitting for friend groups. Add orders together, upload the receipt, and see exactly who owes what.",
  applicationName: "splits.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "splits.",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#c32a2a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-white font-sans text-splits-ink">
        <RememberSession />
        {children}
      </body>
    </html>
  );
}
