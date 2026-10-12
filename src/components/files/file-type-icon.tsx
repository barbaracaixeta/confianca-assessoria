import { cn } from "@/lib/utils";
import { fileKind, fileKindLabel, type FileKind } from "@/lib/admin/product-files";

const TONES: Record<FileKind, string> = {
  pdf: "bg-red-50 text-red-600",
  document: "bg-blue-50 text-blue-600",
  spreadsheet: "bg-green-50 text-pine",
  presentation: "bg-amber-50 text-amber-700",
  archive: "bg-stone-100 text-stone-600",
  image: "bg-purple-50 text-purple-600",
  video: "bg-indigo-50 text-indigo-600",
  audio: "bg-teal-50 text-teal-700",
  code: "bg-slate-100 text-slate-600",
  text: "bg-stone-100 text-stone-600",
  file: "bg-stone-100 text-stone-500",
};

/** Selo quadrado com a extensão, colorido por tipo. Nunca bloqueia formato. */
export function FileTypeIcon({ extension, className }: { extension: string; className?: string }) {
  const kind = fileKind(extension);
  const text = extension ? extension.slice(0, 4).toUpperCase() : "FILE";
  return (
    <span
      aria-hidden="true"
      title={extension ? kind.toUpperCase() : fileKindLabel(kind)}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[0.6875rem] font-semibold uppercase tracking-wide",
        TONES[kind],
        className,
      )}
    >
      {text}
    </span>
  );
}
