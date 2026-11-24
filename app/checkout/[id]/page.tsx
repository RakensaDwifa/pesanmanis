import { redirect } from "next/navigation";
import Checkout from "@/components/checkout/Checkout";
import { isRemote } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Pembayaran",
  description: "Selesaikan pembayaran untuk mengaktifkan ucapanmu.",
  robots: { index: false, follow: false },
};

export default async function CheckoutRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (isRemote()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect(`/login?next=${encodeURIComponent(`/checkout/${id}`)}`);
    }
  }

  return <Checkout id={id} />;
}
