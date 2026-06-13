import logo from "@/assets/breezy-logo.png.asset.json";
import { cn } from "@/lib/utils";

/**
 * Breezy wordmark + logo lockup. Reused across the landing page, auth screen,
 * dashboard, and workspace header so the brand stays consistent.
 */
export function BrandLogo({
  className,
  showWordmark = true,
  size = 28,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <img
        src={logo.url}
        alt="Breezy logo"
        width={size}
        height={size}
        className="rounded-[22%]"
        style={{ width: size, height: size }}
      />
      {showWordmark && (
        <span className="font-semibold tracking-tight">Breezy</span>
      )}
    </span>
  );
}
