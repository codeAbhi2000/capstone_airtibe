import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Draftly",
  description: "AI email drafts that sound like you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
