import "server-only";

const V1_BASE_URL = "https://www.thesportsdb.com/api/v1/json";
const V2_BASE_URL = "https://www.thesportsdb.com/api/v2/json";

export type Team = {
  idTeam: string;
  strTeam: string;
  strTeamShort: string | null;
  strSport: string;
  strLeague: string | null;
  strCountry: string | null;
  strBadge: string | null;
};

export type SportsEvent = {
  idEvent: string;
  strEvent: string;
  strSport: string;
  strLeague: string | null;
  strHomeTeam: string | null;
  strAwayTeam: string | null;
  idHomeTeam: string | null;
  idAwayTeam: string | null;
  intHomeScore: string | number | null;
  intAwayScore: string | number | null;
  strTimestamp: string | null;
  dateEvent: string;
  strTime: string | null;
  strVenue: string | null;
  strStatus: string | null;
  strPostponed: string | null;
};

function getApiKey() {
  const key = process.env.THESPORTSDB_API_KEY;

  if (!key) {
    throw new Error("THESPORTSDB_API_KEY is not configured");
  }

  return key;
}

export async function searchTeams(query: string): Promise<Team[]> {
  const key = getApiKey();

  // v1 is used for searching because its team-search response is well established.
  // This request only runs on our server, so the key is not exposed to the browser.
  const response = await fetch(
    `${V1_BASE_URL}/${key}/searchteams.php?t=${encodeURIComponent(query)}`,
    {
      next: { revalidate: 3600 },
    },
  );

  if (!response.ok) {
    throw new Error(`TheSportsDB team search failed: ${response.status}`);
  }

  const data = (await response.json()) as { teams?: Team[] | null };

  return data.teams ?? [];
}

export async function getNextEvents(
  teamId: string,
): Promise<SportsEvent[]> {
  if (!/^\d+$/.test(teamId)) {
    throw new Error("Invalid team ID");
  }

  const response = await fetch(
    `${V2_BASE_URL}/schedule/full/team/${teamId}`,
    {
      headers: {
        "X-API-KEY": getApiKey(),
      },
      next: { revalidate: 900 },
    },
  );

  if (!response.ok) {
    throw new Error(`TheSportsDB schedule request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    schedule?: SportsEvent[] | null;
  };

  const today = new Date().toISOString().slice(0, 10);

return (data.schedule ?? []).filter(
  (event) => event.dateEvent >= today,
);
}