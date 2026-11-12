import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listStaff,
  requireAdminSession,
  upsertStaffMember,
} from "@/lib/staff";
import { staffUpsertSchema } from "@/lib/validators";

export async function GET() {
  const gate = await requireAdminSession(await auth());
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const staff = await listStaff();
  return NextResponse.json({ staff });
}

export async function POST(request: NextRequest) {
  const gate = await requireAdminSession(await auth());
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = staffUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const staff = await upsertStaffMember(parsed.data);
  return NextResponse.json({ staff }, { status: 201 });
}
