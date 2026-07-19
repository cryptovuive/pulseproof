import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HACKATHON_DATA_LICENSE_EXPIRES_AT,
  assertTxLineDataLicenseActive,
  txLineDataLicenseState,
} from "@/lib/hackathon-compliance";

describe("hackathon compliance guard", () => {
  it("allows TxLINE access during the published hackathon window", () => {
    expect(txLineDataLicenseState(new Date("2026-07-19T23:59:59.000Z"), false)).toMatchObject({
      active: true,
      basis: "hackathon-window",
      expiresAt: HACKATHON_DATA_LICENSE_EXPIRES_AT,
    });
  });

  it("fails closed after the hackathon data licence ends", () => {
    const after = new Date("2026-07-20T00:00:00.000Z");
    expect(txLineDataLicenseState(after, false)).toMatchObject({ active: false, basis: "expired" });
    expect(() => assertTxLineDataLicenseActive(after)).toThrow(/obtain written TxODDS permission/i);
  });

  it("accepts only the explicit written-extension path after expiry", () => {
    expect(txLineDataLicenseState(new Date("2026-07-29T12:00:00.000Z"), true)).toMatchObject({
      active: true,
      basis: "written-extension",
    });
  });

  it("publishes the governing rules without an unnecessary authorship callout", () => {
    const page = readFileSync(join(process.cwd(), "app", "compliance", "page.tsx"), "utf8");
    const matrix = readFileSync(join(process.cwd(), "docs", "HACKATHON_COMPLIANCE.md"), "utf8");
    expect(page).toContain("Superteam Terms");
    expect(page).not.toContain("TRANSPARENT AUTHORSHIP WORKFLOW");
    expect(matrix).toContain("Leave boxes unchecked until");
    expect(matrix).not.toMatch(/- \[x\]/i);
  });
});
