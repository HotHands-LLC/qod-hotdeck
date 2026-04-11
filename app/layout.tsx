import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Question of the Day",
  description: "Ask one question. Three voices answer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
