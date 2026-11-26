import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Program Referral",
  description: "Ajak teman, dapatkan saldo reward.",
  robots: { index: false, follow: false },
};

export default function ReferralPage() {
  redirect("/dashboard?tab=referral");
}
