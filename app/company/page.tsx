import type { Metadata } from "next";
import CompanyPage from "@/components/landing/CompanyPage";

export const metadata: Metadata = {
  title: "Causa — Machine labor needs a referee.",
  description:
    "Every outcome invoice is self-reported by the party getting paid. Causa is the independent layer that checks the work — payer-funded, permanently.",
};

export default function Company() {
  return <CompanyPage />;
}
