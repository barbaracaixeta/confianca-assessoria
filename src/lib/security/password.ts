import "server-only";
import { randomInt } from "node:crypto";

/** Requisitos mínimos pedidos no painel (10+, maiúscula, minúscula, número, especial). */
export const PASSWORD_RULES = {
  minLength: 10,
  tests: [
    { id: "upper", label: "Uma letra maiúscula", re: /[A-Z]/ },
    { id: "lower", label: "Uma letra minúscula", re: /[a-z]/ },
    { id: "number", label: "Um número", re: /\d/ },
    { id: "special", label: "Um caractere especial", re: /[^A-Za-z0-9]/ },
  ] as const,
} as const;

export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < PASSWORD_RULES.minLength) issues.push(`Pelo menos ${PASSWORD_RULES.minLength} caracteres.`);
  for (const t of PASSWORD_RULES.tests) if (!t.re.test(password)) issues.push(t.label + ".");
  return issues;
}

export function validPassword(password: string): boolean {
  return passwordIssues(password).length === 0;
}

const CHARS = {
  upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
  lower: "abcdefghijkmnopqrstuvwxyz",
  digit: "23456789",
  special: "!@#$%&*+=-_",
};

/** Gera uma senha temporária forte (garante as 4 classes de caractere). */
export function generateTemporaryPassword(length = 12): string {
  const groups = [CHARS.upper, CHARS.lower, CHARS.digit, CHARS.special];
  const chars = groups.join("");
  const picked = groups.map((g) => g[randomInt(g.length)]);
  while (picked.length < length) picked.push(chars[randomInt(chars.length)]);
  // embaralha Fisher–Yates com crypto
  for (let i = picked.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked.join("");
}