import type { Metadata } from "next";
import Workbench from "@/components/workbench/Workbench";

export const metadata: Metadata = {
  title: "Causa — Workbench",
  description:
    "Run your own exports through Causa's join engine — agent activity, outcomes, one join key. Everything computes in your browser; no row leaves the tab.",
};

export default function WorkbenchPage() {
  return <Workbench />;
}
