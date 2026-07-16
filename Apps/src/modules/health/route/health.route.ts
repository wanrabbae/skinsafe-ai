import { NextResponse } from "next/server";

import { checkDatabaseConnection } from "../service/health.service";

export async function GET() {
  const database = await checkDatabaseConnection();

  return NextResponse.json(
    {
      status: database.ok ? "ok" : "degraded",
      service: "skinsafe-web",
      version: process.env.npm_package_version ?? "development",
      dependencies: {
        database: database.ok ? "ok" : "error",
      },
    },
    { status: database.ok ? 200 : 503 },
  );
}
