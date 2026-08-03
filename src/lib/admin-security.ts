import "server-only";
import { env } from "@/lib/env";

/**
 * Return true when the caller's IP passes the admin allowlist.
 * Empty allowlist = anywhere is fine. Supports plain IPs and CIDRs,
 * IPv4 + IPv6. Format tolerated: "10.0.0.0/8, 203.0.113.5, ::1/128".
 */
export function ipAllowedForAdmin(ip: string | null | undefined): boolean {
  const list = env.ADMIN_IP_ALLOWLIST?.trim();
  if (!list) return true;
  if (!ip) return false;

  const entries = list
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (entries.length === 0) return true;

  const target = ip.trim();

  for (const entry of entries) {
    if (!entry.includes("/")) {
      if (entry === target) return true;
      continue;
    }
    if (cidrMatches(entry, target)) return true;
  }
  return false;
}

function cidrMatches(cidr: string, ip: string): boolean {
  const parts = cidr.split("/");
  const base = parts[0];
  const bitsStr = parts[1];
  if (!base || !bitsStr) return false;
  const bits = Number(bitsStr);
  if (!Number.isFinite(bits)) return false;

  const isV6 = base.includes(":") || ip.includes(":");
  try {
    const baseBytes = isV6 ? ipv6ToBytes(base) : ipv4ToBytes(base);
    const targetBytes = isV6 ? ipv6ToBytes(ip) : ipv4ToBytes(ip);
    if (baseBytes.length !== targetBytes.length) return false;

    let remaining = bits;
    for (let i = 0; i < baseBytes.length && remaining > 0; i++) {
      const take = Math.min(8, remaining);
      const mask = take === 0 ? 0 : (0xff << (8 - take)) & 0xff;
      const bb = baseBytes[i] ?? 0;
      const tb = targetBytes[i] ?? 0;
      if ((bb & mask) !== (tb & mask)) return false;
      remaining -= take;
    }
    return true;
  } catch {
    return false;
  }
}

function ipv4ToBytes(s: string): number[] {
  const parts = s.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255))
    throw new Error("bad ipv4");
  return parts;
}

function ipv6ToBytes(s: string): number[] {
  // Expand `::` and split into 16-bit groups.
  const [head, tail] = s.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const missing = 8 - headGroups.length - tailGroups.length;
  const groups = [
    ...headGroups,
    ...Array<string>(missing).fill("0"),
    ...tailGroups,
  ];
  if (groups.length !== 8) throw new Error("bad ipv6");
  const bytes: number[] = [];
  for (const g of groups) {
    const n = parseInt(g || "0", 16);
    bytes.push((n >> 8) & 0xff, n & 0xff);
  }
  return bytes;
}

export function adminRequires2FA(): boolean {
  return /^(1|true|yes|on)$/i.test(env.ADMIN_REQUIRE_2FA ?? "");
}
