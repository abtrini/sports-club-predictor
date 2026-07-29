export function getCompetitionTheme(competition: string | null | undefined) {
  const rawValue = (competition ?? "").trim();
  const code = rawValue.toUpperCase();

  const name = rawValue
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const codeThemes: Record<string, string> = {
    PL: "league-premier-league",
    ELC: "league-championship",
    CL: "league-champions-league",
    PD: "league-la-liga",
    BL1: "league-bundesliga",
    SA: "league-serie-a",
    FL1: "league-ligue-1",
    PPL: "league-primeira-liga",
    DED: "league-eredivisie",
    BSA: "league-brazil",
    WC: "league-world-cup",
    EC: "league-euros",
  };

  if (codeThemes[code]) {
    return codeThemes[code];
  }

  if (name.includes("world cup")) {
    return "league-world-cup";
  }

  if (name.includes("european championship") || name.includes("uefa euro")) {
    return "league-euros";
  }

  if (name.includes("champions league")) {
    return "league-champions-league";
  }

  if (
    name.includes("brazil") ||
    name.includes("brasileiro") ||
    name.includes("serie a brazil")
  ) {
    return "league-brazil";
  }

  if (name.includes("premier league") && !name.includes("primeira")) {
    return "league-premier-league";
  }

  if (name === "championship" || name.includes("efl championship")) {
    return "league-championship";
  }

  if (name.includes("la liga") || name.includes("primera division")) {
    return "league-la-liga";
  }

  if (name.includes("bundesliga")) {
    return "league-bundesliga";
  }

  if (name.includes("serie a")) {
    return "league-serie-a";
  }

  if (name.includes("ligue 1")) {
    return "league-ligue-1";
  }

  if (name.includes("primeira liga")) {
    return "league-primeira-liga";
  }

  if (name.includes("eredivisie")) {
    return "league-eredivisie";
  }

  return "league-other";
}
