import { NextResponse } from "next/server";
import { getNextEvents } from "@/lib/thesportsdb";

type RouteContext = {
  params: Promise<{ teamId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { teamId } = await context.params;

  try {
    const events = await getNextEvents(teamId);
    return NextResponse.json({ events });
  } catch (error) {
    console.error(
      "Fixture request failed:",
      error instanceof Error ? error.message : error,
    );

    return NextResponse.json(
      { error: "Unable to load upcoming fixtures" },
      { status: 500 },
    );
  }
}