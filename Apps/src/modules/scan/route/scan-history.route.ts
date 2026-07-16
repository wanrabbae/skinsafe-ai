import { NextResponse } from "next/server";

import { getScanHistory } from "../service/scan.service";

export async function GET() {
  return NextResponse.json(getScanHistory());
}
