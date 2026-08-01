import { NextResponse } from "next/server";
import { searchTeams } from "@/lib/thesportsdb";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json(
      { error: "Enter at least two characters" },
      { status: 400 },
    );
  }

  try {
    const teams = await searchTeams(query);
    return NextResponse.json({ teams });
  } catch (error) {
    console.error(
      "Team search failed:",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      { error: "Unable to search for teams" },
      { status: 500 },
    );
  }
}