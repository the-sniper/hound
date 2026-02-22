import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importFromPlaywright } from "@/lib/import/playwright-importer";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { code } = body;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  try {
    const steps = importFromPlaywright(code);
    return NextResponse.json({ steps });
  } catch (error) {
    return NextResponse.json(
      { error: `Import failed: ${(error as Error).message}` },
      { status: 400 }
    );
  }
}
