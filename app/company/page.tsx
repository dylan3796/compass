import type { Metadata } from "next";
import CompanyPage from "@/components/landing/CompanyPage";

export const metadata: Metadata = {
  title: "Causa — Machine labor needs a referee.",
  description:
    "Software is moving to paying for results — and every result is self-reported by the party getting paid. Causa is the independent record of what agent work is worth. Payer-funded, permanently.",
};

export default function Company() {
  return <CompanyPage />;
}
