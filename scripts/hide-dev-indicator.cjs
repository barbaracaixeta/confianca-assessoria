"use strict";
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
/* Garante que o indicador "Next.js Tools" fique oculto em desenvolvimento.
   O Next persiste a config do DevTools em .next/cache/next-devtools-config.json;
   como essa pasta é regerada, criamos o arquivo antes de cada `next dev`. */
const fs = require("node:fs");
const path = require("node:path");

const target = path.join(__dirname, "..", ".next", "cache", "next-devtools-config.json");
const config = { disableDevIndicator: true };

try {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(config, null, 2));
} catch (err) {
  // Falha silenciosa: se não houver permissão, o indicador apenas reaparece.
}