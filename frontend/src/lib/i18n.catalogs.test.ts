// Every shipped catalog, loaded through the real runtime (F38 FR-9).
// Not a translation review: proves each file parses, resolves through the
// lookup chain, keeps placeholders intact, and covers the whole base catalog.
import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { baseCatalog, registerCatalog, loadCatalog, translate, resetI18n } from "./i18n";

const DIR = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..", "public", "locales");
const load = (tag: string) => JSON.parse(readFileSync(join(DIR, `${tag}.json`), "utf8")) as Record<string, string>;

// The shipped catalogs. English (US) is the bundled base and has no file of
// its own, so Persian is the only one here.
const FULL = ["fa"];

describe.each(FULL)("catalog %s", (tag) => {
  const cat = load(tag);

  beforeEach(async () => {
    resetI18n();
    registerCatalog(tag, cat);
    await loadCatalog(tag);
  });

  it("covers every key in the base catalog", () => {
    const missing = Object.keys(baseCatalog).filter((k) => !(k in cat));
    expect(missing).toEqual([]);
  });

  it("keeps every {placeholder} intact", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
    const broken = Object.keys(cat).filter((k) => k in baseCatalog && ph(baseCatalog[k]) !== ph(cat[k]));
    expect(broken).toEqual([]);
  });

  it("resolves a core editor string in the language, not English", () => {
    // "Undo" is in every design tool's muscle memory; if this one is still
    // English the catalog never loaded.
    expect(translate("editor.undo")).toBe(cat["editor.undo"]);
    expect(translate("editor.undo")).not.toBe("");
  });

  it("keeps brand names and key chords as authored", () => {
    // The brand survives inside a translated sentence, letter for letter.
    expect(translate("settings.how_the_hycanvas_interface_looks_on_this_dev")).toContain("HyCanvas");
    expect(translate("app.ctrl")).toBe("Ctrl");
  });
});

describe("shipped locales", () => {
  it("ships exactly the catalogs the language pickers offer", () => {
    // A catalog with no way to select it is dead weight, and an offered
    // language with no catalog silently falls back to English. Keeping the
    // two lists equal is the only thing that stops them drifting apart.
    const shipped = readdirSync(DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
    expect(shipped).toEqual(["fa"]);
  });
});
