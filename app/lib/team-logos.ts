const normalizeTeamName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const TEAM_LOGO_OVERRIDES = new Map<string, string>([
  ["lache ton grab", "/LacheTonGrab.png"],
]);

export const resolveTeamLogoUrl = (name: string, logoUrl?: string | null) => {
  if (logoUrl) {
    return logoUrl;
  }
  const normalized = normalizeTeamName(name);
  return TEAM_LOGO_OVERRIDES.get(normalized) ?? null;
};
