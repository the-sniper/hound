import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getArtifactStore } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;

  const run = await db.testRun.findUnique({
    where: { id: runId },
    select: { harUrl: true },
  });

  if (!run?.harUrl) {
    return NextResponse.json({ error: "No HAR data available" }, { status: 404 });
  }

  try {
    const store = getArtifactStore();
    const key = `har/${runId}/network.har`;
    const data = await store.download(key);

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "HAR file not found" }, { status: 404 });
  }
}
