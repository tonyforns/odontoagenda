import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  useDatabase: vi.fn(async () => false),
  ensureSchema: vi.fn(async () => undefined),
  getPool: vi.fn(),
  rowToClinicStaff: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  findActiveStaff: vi.fn(),
  linkStaffGoogleSub: vi.fn(),
}));

import * as fileStore from "@/lib/store";
import { requireAdminSession, requireStaffSession } from "@/lib/staff";
import { adminStaffSeed } from "@/lib/staff-seed";
import type { ClinicStaff } from "@/lib/types";

describe("requireStaffSession", () => {
  beforeEach(() => {
    vi.mocked(fileStore.findActiveStaff).mockReset();
  });

  it("returns 401 without session", async () => {
    const gate = await requireStaffSession(null);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.status).toBe(401);
  });

  it("returns 403 for patient without staff row", async () => {
    vi.mocked(fileStore.findActiveStaff).mockResolvedValue(null);
    const gate = await requireStaffSession({
      user: { email: "paciente@gmail.com", googleSub: "sub1" },
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.status).toBe(403);
  });

  it("allows admin staff", async () => {
    const admin = adminStaffSeed();
    vi.mocked(fileStore.findActiveStaff).mockResolvedValue(admin);
    const gate = await requireStaffSession({
      user: { email: admin.email, googleSub: "sub-admin" },
    });
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(gate.role).toBe("admin");
  });
});

describe("requireAdminSession", () => {
  beforeEach(() => {
    vi.mocked(fileStore.findActiveStaff).mockReset();
  });

  it("rejects secretaria", async () => {
    const secretaria: ClinicStaff = {
      id: "staff_sec",
      email: "sec@gmail.com",
      role: "secretaria",
      doctorId: null,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vi.mocked(fileStore.findActiveStaff).mockResolvedValue(secretaria);
    const gate = await requireAdminSession({
      user: { email: secretaria.email, googleSub: "sub-sec" },
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.status).toBe(403);
  });

  it("allows admin", async () => {
    const admin = adminStaffSeed();
    vi.mocked(fileStore.findActiveStaff).mockResolvedValue(admin);
    const gate = await requireAdminSession({
      user: { email: admin.email, googleSub: "sub-admin" },
    });
    expect(gate.ok).toBe(true);
    if (gate.ok) expect(gate.role).toBe("admin");
  });
});
