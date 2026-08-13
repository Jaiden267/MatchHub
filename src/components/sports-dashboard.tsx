"use client";

import Image from "next/image";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SportsEvent, Team } from "@/lib/thesportsdb";

const STORAGE_KEY = "sport-scores-favourite-teams";

function eventStart(event: SportsEvent) {
  const raw =
    event.strTimestamp ||
    `${event.dateEvent}T${event.strTime || "00:00:00"}`;

  const includesTimezone =
    raw.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(raw);

  const parsed = Date.parse(includesTimezone ? raw : `${raw}Z`);

  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function formatEventTime(event: SportsEvent) {
  const timestamp = eventStart(event);

  if (timestamp === Number.MAX_SAFE_INTEGER) {
    return `${event.dateEvent} ${event.strTime || ""}`.trim();
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function SportsDashboard() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Team[]>([]);
  const [favourites, setFavourites] = useState<Team[]>([]);
  const [events, setEvents] = useState<SportsEvent[]>([]);
  const [ready, setReady] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        setFavourites(JSON.parse(saved) as Team[]);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites));

    if (favourites.length === 0) {
      setEvents([]);
      return;
    }

    let cancelled = false;
    setLoadingEvents(true);
    setMessage("");

    Promise.all(
      favourites.map(async (team) => {
        const response = await fetch(
          `/api/teams/${team.idTeam}/events`,
        );

        if (!response.ok) {
          throw new Error(`Could not load ${team.strTeam}`);
        }

        const data = (await response.json()) as {
          events: SportsEvent[];
        };

        return data.events;
      }),
    )
      .then((eventGroups) => {
        if (cancelled) return;

        const uniqueEvents = new Map<string, SportsEvent>();

        eventGroups.flat().forEach((event) => {
          uniqueEvents.set(event.idEvent, event);
        });

        setEvents(
          Array.from(uniqueEvents.values()).sort(
            (a, b) => eventStart(a) - eventStart(b),
          ),
        );
      })
      .catch((error: Error) => {
        if (!cancelled) setMessage(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false);
      });

    return () => {
      cancelled = true;
    };
  }, [favourites, ready]);

  const favouriteIds = useMemo(
    () => new Set(favourites.map((team) => team.idTeam)),
    [favourites],
  );

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (query.trim().length < 2) {
      setMessage("Enter at least two characters.");
      return;
    }

    setSearching(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/teams/search?q=${encodeURIComponent(query.trim())}`,
      );

      const data = (await response.json()) as {
        teams?: Team[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Search failed");
      }

      setResults(data.teams ?? []);

      if (!data.teams?.length) {
        setMessage("No teams were found. Try the full team name.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Search failed",
      );
    } finally {
      setSearching(false);
    }
  }

  function addTeam(team: Team) {
    setFavourites((current) =>
      current.some((item) => item.idTeam === team.idTeam)
        ? current
        : [...current, team],
    );
  }

  function removeTeam(teamId: string) {
    setFavourites((current) =>
      current.filter((team) => team.idTeam !== teamId),
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-10">
      <header className="mb-10">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600">
          MATCH HUB
        </p>
        <h1 className="text-4xl font-bold tracking-tight">
          Every team. One fixture list.
        </h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          Choose teams from different sports and see all their upcoming
          games in one place.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <form className="flex gap-3" onSubmit={handleSearch}>
          <input
            className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Arsenal, Lakers, New York Yankees..."
            value={query}
          />
          <button
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
            disabled={searching}
            type="submit"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </form>

        {results.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {results.map((team) => (
              <button
                className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-left hover:border-blue-500 disabled:opacity-50"
                disabled={favouriteIds.has(team.idTeam)}
                key={team.idTeam}
                onClick={() => addTeam(team)}
                type="button"
              >
                {team.strBadge && (
                  <Image
                    alt=""
                    height={44}
                    src={team.strBadge}
                    width={44}
                  />
                )}

                <span>
                  <strong className="block">{team.strTeam}</strong>
                  <span className="text-sm text-gray-500">
                    {team.strSport}
                    {team.strLeague ? ` · ${team.strLeague}` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {message && (
          <p className="mt-4 text-sm text-red-600">{message}</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-bold">My teams</h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {favourites.length === 0 && (
            <p className="text-gray-500">
              Search for a team to get started.
            </p>
          )}

          {favourites.map((team) => (
            <button
              className="rounded-full bg-gray-900 px-4 py-2 text-sm text-white"
              key={team.idTeam}
              onClick={() => removeTeam(team.idTeam)}
              type="button"
            >
              {team.strTeam} ×
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Upcoming fixtures</h2>
          {loadingEvents && (
            <span className="text-sm text-gray-500">Updating…</span>
          )}
        </div>

        <div className="mt-4 grid gap-3">
          {!loadingEvents &&
            favourites.length > 0 &&
            events.length === 0 && (
              <p className="text-gray-500">
                No upcoming fixtures were returned.
              </p>
            )}

          {events.map((event) => {
            const hasScore =
              event.intHomeScore !== null &&
              event.intAwayScore !== null;

            return (
              <article
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                key={event.idEvent}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-blue-600">
                      {event.strSport}
                      {event.strLeague
                        ? ` · ${event.strLeague}`
                        : ""}
                    </p>

                    <h3 className="mt-1 text-lg font-bold">
                      {event.strHomeTeam || event.strEvent}
                      {event.strAwayTeam &&
                        ` ${hasScore ? event.intHomeScore : "vs"} `}
                      {event.strAwayTeam &&
                        (hasScore
                          ? `${event.intAwayScore} ${event.strAwayTeam}`
                          : event.strAwayTeam)}
                    </h3>

                    {event.strVenue && (
                      <p className="mt-1 text-sm text-gray-500">
                        {event.strVenue}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-semibold">
                      {formatEventTime(event)}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {event.strPostponed === "yes"
                        ? "Postponed"
                        : event.strStatus || "Scheduled"}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
