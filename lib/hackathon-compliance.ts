export const HACKATHON_TERMS_URL = "https://txline.txodds.com/documentation/legal/hackathon-terms";
export const HACKATHON_BRIEF_URL = "https://superteam.fun/earn/hackathon/world-cup";
export const SUPERTEAM_TERMS_URL = "https://superteam.fun/earn/terms-of-use.pdf";

// The public brief identifies 19 July 2026 as the final hackathon day. The
// official Terms say the hackathon-only TxODDS data licence terminates when the
// hackathon concludes, so the default access window closes at the end of that
// UTC day. An override is intentionally explicit and must only be enabled after
// the participant receives written permission from TxODDS.
export const HACKATHON_DATA_LICENSE_EXPIRES_AT = "2026-07-19T23:59:59.999Z";

export type DataLicenseBasis = "hackathon-window" | "written-extension" | "expired";

export interface DataLicenseState {
  active: boolean;
  basis: DataLicenseBasis;
  expiresAt: string;
  termsUrl: string;
}

export function txLineDataLicenseState(
  now = new Date(),
  writtenExtension = process.env.TXLINE_WRITTEN_DATA_LICENSE_EXTENDED === "true",
): DataLicenseState {
  const insideHackathonWindow = now.getTime() <= Date.parse(HACKATHON_DATA_LICENSE_EXPIRES_AT);
  return {
    active: insideHackathonWindow || writtenExtension,
    basis: writtenExtension ? "written-extension" : insideHackathonWindow ? "hackathon-window" : "expired",
    expiresAt: HACKATHON_DATA_LICENSE_EXPIRES_AT,
    termsUrl: HACKATHON_TERMS_URL,
  };
}

export function assertTxLineDataLicenseActive(now = new Date()): void {
  const state = txLineDataLicenseState(now);
  if (!state.active) {
    throw new Error(
      `TxLINE hackathon data access ended at ${state.expiresAt}. `
      + "Keep replay mode available and obtain written TxODDS permission before re-enabling live data.",
    );
  }
}
