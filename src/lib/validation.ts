/**
 * Shared, user-friendly validation helpers.
 * Pakistani mobile numbers, names, addresses, emails and passwords.
 */

export type Check = { ok: boolean; message?: string; value?: string };

const ok = (value?: string): Check => ({ ok: true, ...(value ? { value } : {}) });
const bad = (message: string): Check => ({ ok: false, message });

/** Valid PK mobile prefixes are 03xx (Jazz/Zong/Ufone/Telenor/SCO). */
const PK_MOBILE = /^03[0-46-9]\d{8}$/;

/**
 * Accepts 03001234567, 0300-1234567, +92 300 1234567, 92300..., 3001234567.
 * Returns the canonical 03xxxxxxxxx form in `value`.
 */
export function normalizePkPhone(raw: string): string {
  let d = (raw || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+92")) d = `0${d.slice(3)}`;
  else if (d.startsWith("0092")) d = `0${d.slice(4)}`;
  else if (d.startsWith("92") && d.length >= 12) d = `0${d.slice(2)}`;
  else if (d.startsWith("3") && d.length === 10) d = `0${d}`;
  return d.replace(/\+/g, "");
}

export function validatePkPhone(raw: string): Check {
  const value = normalizePkPhone(raw);
  if (!value) return bad("Phone number is required — e.g. 0300 1234567.");
  if (!/^\d+$/.test(value)) return bad("Phone number can only contain digits.");
  if (value.length !== 11) return bad("A Pakistani mobile number has 11 digits, e.g. 0300 1234567.");
  if (!PK_MOBILE.test(value)) return bad("That doesn't look like a Pakistani mobile number (03xx xxxxxxx).");
  return ok(value);
}

/** Pretty display: 0300 1234567 */
export function formatPkPhone(raw: string): string {
  const v = normalizePkPhone(raw);
  return v.length === 11 ? `${v.slice(0, 4)} ${v.slice(4)}` : raw;
}

export function validateName(raw: string): Check {
  const value = (raw || "").trim().replace(/\s+/g, " ");
  if (!value) return bad("Please enter your full name.");
  if (value.length < 3) return bad("Name looks too short — use your full name.");
  if (value.length > 60) return bad("Name is too long.");
  if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(value)) return bad("Name can only contain letters, spaces, . ' and -");
  return ok(value);
}

export const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function validateEmail(raw: string): Check {
  const value = (raw || "").trim().toLowerCase();
  if (!value) return bad("Email is required.");
  if (!EMAIL_RULE.test(value)) return bad("That email address looks incomplete — e.g. name@gmail.com.");
  return ok(value);
}

export function validatePassword(raw: string): Check {
  const value = raw || "";
  if (!value) return bad("Please choose a password.");
  if (value.length < 8) return bad("Password needs at least 8 characters.");
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value))
    return bad("Add at least one letter and one number to your password.");
  if (/^(password|12345678|qwerty)/i.test(value)) return bad("That password is too easy to guess.");
  return ok(value);
}

export function passwordScore(raw: string): 0 | 1 | 2 | 3 {
  let s = 0;
  if (raw.length >= 8) s++;
  if (/[a-zA-Z]/.test(raw) && /\d/.test(raw)) s++;
  if (raw.length >= 12 || /[^\w\s]/.test(raw)) s++;
  return Math.min(3, s) as 0 | 1 | 2 | 3;
}

export function validateStreet(raw: string): Check {
  const value = (raw || "").trim();
  if (!value) return bad("House / street address is required.");
  if (value.length < 5) return bad("Add a bit more detail so the rider can find you.");
  return ok(value);
}

export function validateCity(raw: string): Check {
  const value = (raw || "").trim();
  if (!value) return bad("City is required.");
  if (value.length < 2) return bad("Enter a valid city name.");
  return ok(value);
}

/** Runs checks in order and returns the first problem. */
export function firstError(...checks: Check[]): string | null {
  for (const c of checks) if (!c.ok) return c.message ?? "Please check this field.";
  return null;
}

/**
 * As-you-type display formatting for a Pakistani mobile number.
 * Keeps what the user typed but groups it: 0300 1234567 / +92 300 1234567.
 */
export function formatPkPhoneInput(raw: string): string {
  const plus = (raw || "").trim().startsWith("+");
  let d = (raw || "").replace(/\D/g, "");
  if (plus || d.startsWith("92")) {
    d = d.replace(/^92/, "").slice(0, 10);
    if (!d) return "+92 ";
    return `+92 ${d.slice(0, 3)}${d.length > 3 ? ` ${d.slice(3)}` : ""}`;
  }
  d = d.slice(0, 11);
  return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d;
}
