import { describe, expect, it } from "vitest";
import { shouldUseSsl } from "@/lib/db-ssl";

describe("shouldUseSsl", () => {
  it("enables SSL for Supabase URLs", () => {
    expect(
      shouldUseSsl(
        "postgresql://postgres:x@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
      ),
    ).toBe(true);
  });

  it("respects sslmode=disable", () => {
    expect(
      shouldUseSsl(
        "postgresql://postgres:x@localhost:5432/odonto?sslmode=disable",
      ),
    ).toBe(false);
  });
});
