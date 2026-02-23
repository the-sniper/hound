import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plugins = await db.pluginDefinition.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { installs: true } },
    },
  });

  return NextResponse.json(plugins);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const plugin = await db.pluginDefinition.upsert({
    where: { name: body.name },
    update: {
      version: body.version,
      description: body.description,
      author: body.author,
      category: body.category,
      entrypoint: body.entrypoint,
      configSchema: body.configSchema ?? {},
    },
    create: {
      name: body.name,
      version: body.version,
      description: body.description,
      author: body.author,
      category: body.category,
      entrypoint: body.entrypoint,
      configSchema: body.configSchema ?? {},
    },
  });

  return NextResponse.json(plugin, { status: 201 });
}
