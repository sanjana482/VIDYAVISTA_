import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

function handleRevalidate(req: NextRequest) {
  const secret =
    req.headers.get("x-revalidate-secret") ||
    req.nextUrl.searchParams.get("secret");
  const expected = process.env.REVALIDATE_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json(
      { ok: false, error: "Invalid or missing secret" },
      { status: 401 }
    );
  }

  revalidatePath("/", "layout"); // saare pages ka cache hata do
  return NextResponse.json({ ok: true, revalidated: true, at: Date.now() });
}

export async function GET(req: NextRequest) {
  return handleRevalidate(req);
}

export async function POST(req: NextRequest) {
  return handleRevalidate(req);
}
