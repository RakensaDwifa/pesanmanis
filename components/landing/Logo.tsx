import Link from "next/link";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export default function Logo({
  light = false,
  className,
}: {
  light?: boolean;
  className?: string;
}) {
  return (
    <Link href="/" className={cn("group flex items-center gap-1.5", className)}>
      <Heart
        className={cn(
          "h-6 w-6 transition-transform duration-300 group-hover:scale-115 group-hover:-rotate-6 motion-reduce:transform-none",
          light ? "text-white" : "text-primary"
        )}
        fill="currentColor"
      />
      <span
        className={cn(
          "font-heading text-lg sm:text-xl lg:text-2xl italic tracking-tight transition-opacity duration-200 group-hover:opacity-90",
          light ? "text-white" : "text-primary"
        )}
      >
        {BRAND.name}
      </span>
    </Link>
  );
}
