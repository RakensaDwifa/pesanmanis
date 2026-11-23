import Checkout from "@/components/checkout/Checkout";

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
  return <Checkout id={id} />;
}
