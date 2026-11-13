import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listDoctorScheduleWindows,
  replaceDoctorSchedule,
  resolveScheduleDoctorId,
} from "@/lib/doctor-schedule";
import { requireStaffSession } from "@/lib/staff";
import { doctorScheduleReplaceSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const gate = await requireStaffSession(await auth());
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const doctorId = resolveScheduleDoctorId(
    request.nextUrl.searchParams.get("doctorId"),
  );
  const windows = await listDoctorScheduleWindows(doctorId);
  return NextResponse.json({ doctorId, windows });
}

export async function PUT(request: NextRequest) {
  const gate = await requireStaffSession(await auth());
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = doctorScheduleReplaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const doctorId = resolveScheduleDoctorId(parsed.data.doctorId);

  try {
    const windows = await replaceDoctorSchedule(doctorId, parsed.data.windows);
    return NextResponse.json({ doctorId, windows });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar el horario.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
