export interface TeamBranding {
  code: string;
  flagKey: string;
  canonicalName: string;
}

type TeamDefinition = {
  code: string;
  iso2?: string;
  flagTag?: string;
  aliases?: string[];
};

const TEAMS: Record<string, TeamDefinition> = {
  Algeria: { code: "ALG", iso2: "DZ" },
  Argentina: { code: "ARG", iso2: "AR" },
  Australia: { code: "AUS", iso2: "AU" },
  Austria: { code: "AUT", iso2: "AT" },
  Belgium: { code: "BEL", iso2: "BE" },
  "Bosnia & Herzegovina": { code: "BIH", iso2: "BA", aliases: ["Bosnia and Herzegovina", "Bosnia-Herzegovina"] },
  Brazil: { code: "BRA", iso2: "BR" },
  Canada: { code: "CAN", iso2: "CA" },
  "Cape Verde": { code: "CPV", iso2: "CV", aliases: ["Cabo Verde"] },
  Colombia: { code: "COL", iso2: "CO" },
  "Congo DR": { code: "COD", iso2: "CD", aliases: ["DR Congo", "Congo-Kinshasa", "Democratic Republic of the Congo"] },
  Croatia: { code: "CRO", iso2: "HR" },
  Curacao: { code: "CUW", iso2: "CW", aliases: ["Curaçao"] },
  "Czech Republic": { code: "CZE", iso2: "CZ", aliases: ["Czechia"] },
  Ecuador: { code: "ECU", iso2: "EC" },
  Egypt: { code: "EGY", iso2: "EG" },
  England: { code: "ENG", flagTag: "gbeng" },
  France: { code: "FRA", iso2: "FR" },
  Germany: { code: "GER", iso2: "DE" },
  Ghana: { code: "GHA", iso2: "GH" },
  Haiti: { code: "HAI", iso2: "HT" },
  Iran: { code: "IRN", iso2: "IR", aliases: ["IR Iran", "Islamic Republic of Iran"] },
  Iraq: { code: "IRQ", iso2: "IQ" },
  "Ivory Coast": { code: "CIV", iso2: "CI", aliases: ["Côte d'Ivoire", "Cote d'Ivoire"] },
  Japan: { code: "JPN", iso2: "JP" },
  Jordan: { code: "JOR", iso2: "JO" },
  Mexico: { code: "MEX", iso2: "MX" },
  Morocco: { code: "MAR", iso2: "MA" },
  Netherlands: { code: "NED", iso2: "NL", aliases: ["Holland"] },
  "New Zealand": { code: "NZL", iso2: "NZ" },
  Norway: { code: "NOR", iso2: "NO" },
  Panama: { code: "PAN", iso2: "PA" },
  Paraguay: { code: "PAR", iso2: "PY" },
  Portugal: { code: "POR", iso2: "PT" },
  Qatar: { code: "QAT", iso2: "QA" },
  "Saudi Arabia": { code: "KSA", iso2: "SA" },
  Scotland: { code: "SCO", flagTag: "gbsct" },
  Senegal: { code: "SEN", iso2: "SN" },
  "South Africa": { code: "RSA", iso2: "ZA" },
  "South Korea": { code: "KOR", iso2: "KR", aliases: ["Korea Republic", "Republic of Korea"] },
  Spain: { code: "ESP", iso2: "ES" },
  Sweden: { code: "SWE", iso2: "SE" },
  Switzerland: { code: "SUI", iso2: "CH" },
  TBD: { code: "TBD", flagTag: "un" },
  Tunisia: { code: "TUN", iso2: "TN" },
  Turkey: { code: "TUR", iso2: "TR", aliases: ["Türkiye", "Turkiye"] },
  USA: { code: "USA", iso2: "US", aliases: ["United States", "United States of America", "US"] },
  Uruguay: { code: "URU", iso2: "UY" },
  Uzbekistan: { code: "UZB", iso2: "UZ" },
  Wales: { code: "WAL", flagTag: "gbwls" },
};

function normalise(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

const LOOKUP = new Map<string, [string, TeamDefinition]>();
for (const [canonicalName, definition] of Object.entries(TEAMS)) {
  LOOKUP.set(normalise(canonicalName), [canonicalName, definition]);
  for (const alias of definition.aliases ?? []) LOOKUP.set(normalise(alias), [canonicalName, definition]);
}

function fallbackCode(teamName: string) {
  const words = teamName.match(/[A-Za-z0-9]+/g) ?? [];
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase().padEnd(3, "X");
  return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase().padEnd(3, "X");
}

export function getTeamBranding(teamName: string): TeamBranding {
  const match = LOOKUP.get(normalise(teamName));
  if (!match) return { code: fallbackCode(teamName), flagKey: "UN", canonicalName: teamName };
  const [canonicalName, definition] = match;
  return {
    code: definition.code,
    flagKey: definition.flagTag === "un" ? "UN" : definition.flagTag ? definition.flagTag.toUpperCase().replace("GB", "GB-") : definition.iso2!,
    canonicalName,
  };
}

export const SUPPORTED_TEAM_COUNT = Object.keys(TEAMS).length;
