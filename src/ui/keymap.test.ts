import { describe, it, expect } from "vitest";
import { footerHints } from "./keymap";

describe("footerHints", () => {
  it("shows Turtle in red when throttle is disabled", () => {
    const hints = footerHints("content", "all", false);
    const throttleHint = hints.find((h) => h.keys === "T");
    expect(throttleHint).toBeDefined();
    expect(throttleHint?.label).toBe("Turtle");
    expect(throttleHint?.color).toBe("red");
  });

  it("shows Full Speed in green when throttle is enabled", () => {
    const hints = footerHints("content", "all", true);
    const throttleHint = hints.find((h) => h.keys === "T");
    expect(throttleHint).toBeDefined();
    expect(throttleHint?.label).toBe("Full Speed");
    expect(throttleHint?.color).toBe("green");
  });

  it("places the throttle hint immediately before SWITCH", () => {
    const hints = footerHints("content", "downloads", false);
    const tIndex = hints.findIndex((h) => h.keys === "T");
    const switchIndex = hints.findIndex((h) => h.keys === "tab");
    
    // T should exist
    expect(tIndex).toBeGreaterThan(-1);
    // SWITCH should exist
    expect(switchIndex).toBeGreaterThan(-1);
    // T should be immediately before SWITCH
    expect(tIndex).toBe(switchIndex - 1);
  });
});
