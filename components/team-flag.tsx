import {
  AR, AT, AU, BA, BE, BR, CA, CD, CH, CI, CO, CV, CW, CZ, DE, DZ, EC, EG,
  ES, FR, GH, HR, HT, IQ, IR, JO, JP, KR, MA, MX, NL, NO, NZ, PA, PT, PY,
  QA, SA, SE, SN, TN, TR, US, UY, UZ, ZA,
} from "country-flag-icons/react/3x2";

type SvgFlag = typeof FR;

const COUNTRY_FLAGS: Record<string, SvgFlag> = {
  AR, AT, AU, BA, BE, BR, CA, CD, CH, CI, CO, CV, CW, CZ, DE, DZ, EC, EG,
  ES, FR, GH, HR, HT, IQ, IR, JO, JP, KR, MA, MX, NL, NO, NZ, PA, PT, PY,
  QA, SA, SE, SN, TN, TR, US, UY, UZ, ZA,
};

function EnglandFlag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 36" aria-hidden="true">
      <rect width="60" height="36" fill="#fff" />
      <rect x="25" width="10" height="36" fill="#cf142b" />
      <rect y="13" width="60" height="10" fill="#cf142b" />
    </svg>
  );
}

function ScotlandFlag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 36" aria-hidden="true">
      <rect width="60" height="36" fill="#0065bd" />
      <path d="M-3 0 57 36M3 0 63 36M57 0-3 36M63 0 3 36" stroke="#fff" strokeWidth="5" />
    </svg>
  );
}

function WalesFlag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 36" aria-hidden="true">
      <rect width="60" height="18" fill="#fff" />
      <rect y="18" width="60" height="18" fill="#00ab39" />
      <path d="M12 23c6-12 12-15 22-10l8-5-2 8 7 3-8 2 5 7-10-3-4 7-4-8-9 4 3-7z" fill="#d30731" />
    </svg>
  );
}

function UnknownFlag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 36" aria-hidden="true">
      <rect width="60" height="36" fill="#303631" />
      <circle cx="30" cy="18" r="10" fill="#f2f4ee" />
      <path d="m30 10 5 4-2 6h-6l-2-6zM20 17l7 3-1 7-5-2zM40 17l-7 3 1 7 5-2z" fill="#1b201c" />
    </svg>
  );
}

export function TeamFlag({ flagKey, className }: { flagKey: string; className?: string }) {
  if (flagKey === "GB-ENG") return <EnglandFlag className={className} />;
  if (flagKey === "GB-SCT") return <ScotlandFlag className={className} />;
  if (flagKey === "GB-WLS") return <WalesFlag className={className} />;
  const Flag = COUNTRY_FLAGS[flagKey];
  return Flag ? <Flag className={className} aria-hidden="true" /> : <UnknownFlag className={className} />;
}
