import Image from "next/image";
import { cn } from "@/lib/utils";

/** Logo oficial da marca (lockup símbolo + nome), em /public/brand. */
const LOGO = {
  color: { src: "/brand/logo.png", width: 640, height: 347 },
  light: { src: "/brand/logo-light.png", width: 640, height: 346 },
} as const;

export function Logo({
  className,
  tone = "color",
  compact = false,
  priority = false,
}: {
  className?: string;
  /** `light` para fundos escuros (rodapé); `color` para fundos claros. */
  tone?: "color" | "light";
  /** Versão menor (mobile e painel). */
  compact?: boolean;
  /** Pré-carrega a imagem (use no cabeçalho). */
  priority?: boolean;
}) {
  const { src, width, height } = LOGO[tone];
  return (
    <Image
      src={src}
      alt="Confiança Assessoria Acadêmica"
      width={width}
      height={height}
      priority={priority}
      sizes="180px"
      className={cn("w-auto", compact ? "h-8" : "h-10", className)}
    />
  );
}
