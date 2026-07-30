import { NextResponse } from "next/server";

import { syncFootballDataResults } from "@/lib/result-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorised(request: Request) {
  const configuredSecret = process.env.RESULT_SYNC_SECRET?.trim();

  const providedSecret = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  return Boolean(
    configuredSecret && providedSecret && configuredSecret === providedSecret,
  );
}

async function handleRequest(request: Request) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await syncFootballDataResults();

    return NextResponse.json({
      ok: true,
      ...summary,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Result sync failed.",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
