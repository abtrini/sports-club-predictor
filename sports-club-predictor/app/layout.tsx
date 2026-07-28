import type { Metadata } from "next";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sports Club Predictor",
  description: "Friendly football prediction league standings for the 2026/27 season.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <footer>
          <p>Sports Club Predictor · Friendly competition · 2026/27</p>
        </footer>
      </body>
    </html>
  );
}
