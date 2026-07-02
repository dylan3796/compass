import type { Metadata } from "next";
import DemoApp from "@/components/demo/DemoApp";

export const metadata: Metadata = {
  title: "Causa — Demo",
};

export default function DemoPage() {
  return <DemoApp />;
}
