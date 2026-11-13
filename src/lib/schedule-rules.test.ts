import { describe, expect, it } from "vitest";
import {
  availableEndTimes,
  availableStartTimes,
  findInvertedWindows,
  findOverlappingWindows,
  invalidWindowIndexesForDay,
  legacyWindowsFromSchedule,
  validateScheduleWindows,
  workDaysFromWindowInputs,
} from "./schedule-rules";

describe("findOverlappingWindows", () => {
  it("acepta franjas sin solape", () => {
    expect(
      findOverlappingWindows([
        { weekday: 1, startTime: "09:00", endTime: "12:00" },
        { weekday: 1, startTime: "15:00", endTime: "18:00" },
      ]),
    ).toBeNull();
  });

  it("detecta solape en el mismo día", () => {
    const error = findOverlappingWindows([
      { weekday: 2, startTime: "09:00", endTime: "12:00" },
      { weekday: 2, startTime: "11:00", endTime: "13:00" },
    ]);
    expect(error).toMatch(/Martes/);
  });
});

describe("findInvertedWindows", () => {
  it("detecta inicio >= fin", () => {
    expect(
      findInvertedWindows([
        { weekday: 1, startTime: "12:00", endTime: "09:00" },
      ]),
    ).toMatch(/invertida/);
  });

  it("acepta franja válida", () => {
    expect(
      findInvertedWindows([
        { weekday: 1, startTime: "09:00", endTime: "12:00" },
      ]),
    ).toBeNull();
  });
});

describe("validateScheduleWindows", () => {
  it("prioriza invertida sobre solape", () => {
    expect(
      validateScheduleWindows([
        { weekday: 1, startTime: "12:00", endTime: "09:00" },
        { weekday: 1, startTime: "08:00", endTime: "13:00" },
      ]),
    ).toMatch(/invertida/);
  });
});

describe("invalidWindowIndexesForDay", () => {
  it("marca invertidas y solapadas", () => {
    expect(
      [...invalidWindowIndexesForDay([{ startTime: "14:00", endTime: "10:00" }])],
    ).toEqual([0]);
    expect(
      [
        ...invalidWindowIndexesForDay([
          { startTime: "09:00", endTime: "12:00" },
          { startTime: "11:00", endTime: "13:00" },
        ]),
      ].sort(),
    ).toEqual([0, 1]);
  });
});

describe("availableStartTimes / availableEndTimes", () => {
  it("oculta fines anteriores o iguales al inicio", () => {
    expect(
      availableEndTimes({
        startTime: "09:00",
        otherWindows: [],
      }),
    ).not.toContain("09:00");
    expect(
      availableEndTimes({
        startTime: "09:00",
        otherWindows: [],
      }),
    ).toContain("09:30");
  });

  it("oculta inicios que solaparían otra franja", () => {
    const starts = availableStartTimes({
      endTime: "12:00",
      otherWindows: [{ startTime: "15:00", endTime: "18:00" }],
    });
    expect(starts).toContain("09:00");
    expect(starts).not.toContain("15:00");
  });

  it("oculta fines que solaparían otra franja", () => {
    const ends = availableEndTimes({
      startTime: "09:00",
      otherWindows: [{ startTime: "12:00", endTime: "14:00" }],
    });
    expect(ends).toContain("11:30");
    expect(ends).not.toContain("12:30");
  });
});

describe("legacy helpers", () => {
  it("deriva workDays y ventanas únicas", () => {
    const windows = [
      { weekday: 1, startTime: "09:00", endTime: "12:00" },
      { weekday: 3, startTime: "09:00", endTime: "12:00" },
      { weekday: 3, startTime: "15:00", endTime: "18:00" },
    ];
    expect(workDaysFromWindowInputs(windows)).toEqual([1, 3]);
    expect(legacyWindowsFromSchedule(windows)).toEqual([
      { start: "09:00", end: "12:00" },
      { start: "15:00", end: "18:00" },
    ]);
  });
});
