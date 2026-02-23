import { NextRequest, NextResponse } from "next/server";
import { getArtifactStore } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webm: "video/webm",
  mp4: "video/mp4",
  json: "application/json",
  har: "application/json",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const key = pathSegments.join("/");

  try {
    const store = getArtifactStore();
    const data = await store.download(key);

    const ext = key.split(".").pop()?.toLowerCase() || "";

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
  }
}
