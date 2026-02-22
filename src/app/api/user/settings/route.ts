import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod/v4";

// Transform empty strings to undefined so .optional() works correctly
const emptyToUndefined = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? undefined : val;

const updateSettingsSchema = z.object({
  name: z.preprocess(emptyToUndefined, z.string().optional()),
  email: z.preprocess(emptyToUndefined, z.string().email().optional()),
  anthropicKey: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
  openaiKey: z.preprocess(emptyToUndefined, z.string().optional().nullable()),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      anthropicKey: true,
      openaiKey: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Mask keys for security
  const maskKey = (key: string | null) => 
    key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : null;

  return NextResponse.json({
    ...user,
    anthropicKeyMasked: maskKey(user.anthropicKey),
    openaiKeyMasked: maskKey(user.openaiKey),
    // We don't send the full keys back to the client for security unless needed, 
    // but for settings page we might need to know if they exist.
    hasAnthropicKey: !!user.anthropicKey,
    hasOpenAIKey: !!user.openaiKey,
  });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateSettingsSchema.parse(body);

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.anthropicKey !== undefined && { anthropicKey: data.anthropicKey }),
        ...(data.openaiKey !== undefined && { openaiKey: data.openaiKey }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        anthropicKey: true,
        openaiKey: true,
      },
    });

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      hasAnthropicKey: !!updatedUser.anthropicKey,
      hasOpenAIKey: !!updatedUser.openaiKey,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const field = firstIssue?.path?.join(".") || "input";
      return NextResponse.json(
        { error: `Invalid ${field}: ${firstIssue?.message || "Invalid input"}`, details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
