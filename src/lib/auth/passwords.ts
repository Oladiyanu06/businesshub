import "server-only";

import { randomBytes } from "node:crypto";

const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

function pick(source: string) {
  return source[randomBytes(4).readUInt32BE(0) % source.length];
}

/**
 * Generates a one-time password shown once to the administrator. The employee
 * must change it at first sign-in (employees.must_change_password = true).
 */
export function generateTemporaryPassword() {
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: 12 }, () => pick(ALL));
  const characters = [...required, ...rest];

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = randomBytes(4).readUInt32BE(0) % (index + 1);
    [characters[index], characters[swap]] = [characters[swap], characters[index]];
  }

  return characters.join("");
}

export function generateEmployeeNumber(prefix = "EMP") {
  const suffix = randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
  return `${prefix}-${suffix}`;
}

export function generateBranchCode(name: string, existing: string[] = []) {
  const base =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.slice(0, 4))
      .join("")
      .slice(0, 8) || "BRANCH";

  let code = base;
  let counter = 2;
  while (existing.includes(code)) {
    code = `${base.slice(0, 6)}-${counter}`;
    counter += 1;
  }
  return code;
}
