import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isRemote } from "@/lib/supabase/config";
import LoginForm from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke dashboard PesanManis.",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (isRemote()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/dashboard");
  }

  return <LoginForm remote={isRemote()} />;
}
