import { describe, it, expect } from "vitest";
import { calculateProgress } from "../../src/services/progress.service";

describe("calculateProgress", () => {
  // --- casos de borda ---

  it("retorna 0 quando não há tasks nem evaluations", () => {
    expect(calculateProgress([], [])).toBe(0);
  });

  it("usa 100% o peso das tasks quando não há evaluations", () => {
    const tasks = [{ completed: true }, { completed: false }];
    expect(calculateProgress(tasks, [])).toBe(0.5);
  });

  it("usa 100% o peso das evaluations quando não há tasks", () => {
    const evals = [
      { completed: true },
      { completed: true },
      { completed: false },
    ];
    expect(calculateProgress([], evals)).toBeCloseTo(0.666, 2);
  });

  // --- combinação ---

  it("retorna 1 quando tudo está concluído", () => {
    const tasks = [{ completed: true }, { completed: true }];
    const evals = [{ completed: true }];
    expect(calculateProgress(tasks, evals)).toBe(1);
  });

  it("retorna 0 quando nada está concluído", () => {
    const tasks = [{ completed: false }, { completed: false }];
    const evals = [{ completed: false }];
    expect(calculateProgress(tasks, evals)).toBe(0);
  });

  it("calcula combinação correta (tasks 100%, evals 50%)", () => {
    const tasks = [{ completed: true }, { completed: true }]; // 100%
    const evals = [{ completed: true }, { completed: false }]; // 50%
    // 1.0 * 0.5 + 0.5 * 0.5 = 0.75
    expect(calculateProgress(tasks, evals)).toBe(0.75);
  });

  it("calcula combinação correta (tasks 50%, evals 0%)", () => {
    const tasks = [{ completed: true }, { completed: false }]; // 50%
    const evals = [{ completed: false }]; // 0%
    // 0.5 * 0.5 + 0.0 * 0.5 = 0.25
    expect(calculateProgress(tasks, evals)).toBe(0.25);
  });
});
