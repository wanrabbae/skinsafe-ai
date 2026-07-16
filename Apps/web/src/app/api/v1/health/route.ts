import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "skinsafe-web", version: process.env.npm_package_version ?? "development" });
}
