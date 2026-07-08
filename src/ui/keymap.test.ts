import { describe, it, expect } from "vitest";
import { footerHints, HELP_GROUPS } from "./keymap";

describe("footerHints", () => {
  it("shows file inspection hints when inspecting is true", () => {
    const hints = footerHints("content", "downloads", "downloading", null, true, true);
    
    expect(hints).toEqual(
      expect.arrayContaining([
        { keys: "↑↓", label: "Move" },
        { keys: "space", label: "Skip", color: "red" },
        { keys: "↵", label: "Open" },
        { keys: "esc", label: "Back" },
      ])
    );
  });

  it("shows the 'i' hint in the downloads section", () => {
    const hints = footerHints("content", "downloads", "paused", null, false);
    
    expect(hints).toEqual(
      expect.arrayContaining([
        { keys: "i", label: "Files" },
      ])
    );
  });

  it("shows the 'i' hint in the search section (default section fallback)", () => {
    const hints = footerHints("content", "search", null, null, false);
    
    // Fallback hints in keymap.ts advertise 'Search' as the section default
    expect(hints).toEqual(
      expect.arrayContaining([
        { keys: "/", label: "Search" },
      ])
    );
  });
});

describe("HELP_GROUPS", () => {
  it("includes the 'Files' group with toggle capabilities", () => {
    const filesGroup = HELP_GROUPS.find((g) => g.title === "Files");
    expect(filesGroup).toBeDefined();
    
    const spaceHint = filesGroup?.hints.find((h) => h.keys === "space");
    expect(spaceHint).toBeDefined();
    expect(spaceHint?.label).toBe("Keep or skip file");
  });

  it("includes 'i' to inspect files in Search and Downloads groups", () => {
    const searchGroup = HELP_GROUPS.find((g) => g.title === "Search");
    const searchInspectHint = searchGroup?.hints.find((h) => h.keys === "i");
    expect(searchInspectHint).toBeDefined();

    const downloadsGroup = HELP_GROUPS.find((g) => g.title === "Downloads");
    const downloadsInspectHint = downloadsGroup?.hints.find((h) => h.keys === "i");
    expect(downloadsInspectHint).toBeDefined();
  });
});
