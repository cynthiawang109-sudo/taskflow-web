import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "TaskFlow — demo workspace",
  description: "A simple task board for the fictional TaskFlow demo API.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
