// Loader de desenvolvimento: resolve o alias "@/..." e imports sem extensão
// para rodar scripts de teste com Node diretamente (fora do bundler do Next).
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.cwd();

function resolveFile(base) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.js`,
    `${base}.mjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];
  return candidates.find((c) => existsSync(c)) ?? null;
}

registerHooks({
  resolve(specifier, context, next) {
    // Nunca interferir na resolução interna de dependências em node_modules.
    if (context.parentURL && context.parentURL.includes("/node_modules/")) {
      return next(specifier, context);
    }
    if (specifier.startsWith("@/")) {
      const target = resolveFile(path.join(root, "src", specifier.slice(2)));
      if (target) return next(pathToFileURL(target).href, context);
    }
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
      const parent = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : root;
      const target = resolveFile(path.join(parent, specifier));
      if (target) return next(pathToFileURL(target).href, context);
    }
    return next(specifier, context);
  },
});
