import { afterEach, describe, expect, it } from "vitest";
import {
  hasDatabaseUrl,
  resetDatabaseAvailabilityForTests,
  useDatabase,
} from "@/lib/db";

describe("useDatabase", () => {
  const previous = process.env.DATABASE_URL;

  afterEach(() => {
    if (previous === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous;
    resetDatabaseAvailabilityForTests();
  });

  it("returns false without DATABASE_URL", async () => {
    delete process.env.DATABASE_URL;
    resetDatabaseAvailabilityForTests();
    expect(hasDatabaseUrl()).toBe(false);
    expect(await useDatabase()).toBe(false);
  });
});
