"use client";

import { ModelProvider } from "@/components/model-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <ModelProvider>{children}</ModelProvider>;
}
