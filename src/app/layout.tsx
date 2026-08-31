import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist } from "next/font/google";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  title: "Horizon · Mar del Sur",
  description: "Recorrido del modelo de proyección, variables y estados financieros.",
};

function hasClerkKeys() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const inner = (
    <html lang="es">
      <body className={`${geist.variable} min-h-screen antialiased`}>{children}</body>
    </html>
  );

  if (!hasClerkKeys()) return inner;

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      {inner}
    </ClerkProvider>
  );
}
