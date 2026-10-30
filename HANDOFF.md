# A005 local handoff

Date: 2026-10-20. Implementation system: **GPT-6.1 Sol**. Status: locally functional experimental 0.1.0, not public or market-validated. Independent review and final standalone checks are recorded below.

## Continue

```sh
cd pptx-font-locator
npm ci
npm test
npm run build
npm run dev
```

Preview: http://127.0.0.1:4315/ . Use the synthetic example, filter **Ghost Sans**, inspect the first Exact package location. Expect five references: slide list levels 2, 3, 4 and 5 plus master body-style level 3. The full package has 18 references across seven PPT XML parts.

## Implemented

- Static TypeScript/Vite/native DOM tool; no backend, uploads, analytics, storage, CDN/runtime remote fetches or AI calls.
- Package CRC validation, advertised and actual expansion bounds, limited XML parsing, explicit invalid/unsupported/limited outcomes; no partial success result.
- Exact canonical namespace breadcrumbs, slide order via relationships, shape and placeholder identifiers, list level, text/context, explicit names vs theme tokens, resolved declarations vs unresolved fallback.
- All PPT XML declarations scanned, including notes, notes master, layouts, masters, theme alternate scripts and orphaned parts.
- Filter, one-click original synthetic example, JSON and spreadsheet-safe CSV reports. File input bytes remain unchanged.
- Responsive restrained UI with keyboard labels, visible focus, live status, empty/error states and caveats.

## Verification actually run

- `npm test`: **20 tests passed** (exact part/path/levels/IDs, prefix changes, notes/master/layout/theme, theme resolution/unresolved fallback, slide relationship order, unchanged input, unsupported/non-PPTX/encrypted, malformed ZIP/XML, CRC, actual expansion vs forged size, input/entry/XML/depth caps, untrusted strings and CSV escaping).
- `npm run build`: TypeScript check and Vite production bundle passed.
- `npm audit` after patched dependency update: **0 vulnerabilities** reported at install time. This is an npm advisory snapshot, not a security guarantee.
- Same-model local headless installed Chrome smoke: desktop 1280×1000 and mobile 390×844; example→18 references, filter→five, exact path visible, downloaded JSON→five, corrupt input→INVALID and stale report hidden. No JS page errors or external network requests observed. Desktop/results screenshots inspected; a full-page Chrome screenshot immediately after viewport resize repeated compositor content, so mobile capture uses viewport screenshot. This does not establish cross-browser acceptance.
- Original demo is a structural ZIP/XML fixture. It has **not** been opened, rendered or validated in PowerPoint. No real customer presentation has been tested.

Installed direct versions: fflate 0.8.3, Vite 7.3.7, TypeScript 5.9.3, Vitest 5.0.5, jsdom 26.1.0, tsx 4.23.15, @types/node 22.20.5 (lockfile is authoritative; see `npm ls --depth=0` for local confirmation). Runtime Node 26.12.0, npm 11.20.0.

## Remaining limits / review focus

- Parser runs on the main thread within enforced limits; larger accepted files may briefly block the UI.
- Scope is stored nonempty DrawingML @typeface values. Effective inheritance, language fallback, actual rendering, installed/missing fonts, font extraction, full embedded-object inspection and rewriting/repair are outside scope.
- Diagnostic fixtures exercise semantics but do not prove PowerPoint interoperability or a user's successful correction. Independent review and Chrome/Firefox checks now cover the recorded synthetic paths. Real permitted decks, native PowerPoint review, Safari and physical mobile remain open.
- No competitor parity/superiority or novelty claim. Slidewise, ShowFonts and Stoatworks already exist; this local flow remains unvalidated with users.
- No remote Git, publication, outreach, accounts, spending, customer metrics or founder attention measurements.


## Independent review and final closeout

The root coordinator and separate GPT-6 Astra reviewer corrected three P2 findings: uppercase/content-typed XML parts were omitted, suffix-only relationship matching accepted custom types, and old asynchronous scan continuations could overwrite newer input. Part selection now follows declared XML content types with a case-insensitive extension fallback; only full recognized transitional/strict Office relationship and id namespaces participate. Every asynchronous UI boundary is generation-checked.

The coordinator added deterministic original fixture timestamps and generated embedded demo source. The offline standalone `dist/pptx-font-locator-standalone.html` uses no demo fetch and requires no network. `prebuild`/`predev` regenerate ignored `src/demo.generated.ts`; ordinary source archives need only the authored generator and checked-in synthetic fixture. Existing20 tests and TypeScript/build passed after the fixes; core tests were not rerun just for packaging.

Independent fixture `verification/fixtures/independent-master-font.pptx` has363 references matching the separate Python/XPath part/font multiset oracle, including two inserted `RootReview Hidden Font` references at exact master bodyStyle/otherStyle list level3. Its base was exported by the bundled artifact tool; this is not a PowerPoint native validation. `verification/hidden-locations.json` adds independently derived exact breadcrumbs for those two references. No embedded font binaries are present in either diagnostic fixture.

Final portable `scripts/browser-regression.mjs` passed Chrome155.0.8059.85 and Firefox153.0 at file:// with networking offline: embedded demo18/filter5; independent363/exacthidden2/filter export; keyboard disclosure;390px layout; corrupt input clears old result; stale animation-frame after new unsupported input; reverse local reads; delayed embedded-demo read after a newer local selection. No page errors or HTTP requests were captured; mobile result screenshots were inspected. These controlled async probes are not latency measurements. Sanitized review records are in verification/.

`npm run package` writes:

- `release/pptx-font-locator-0.1.0.zip`: standalone HTML, README, LICENSE, THIRD_PARTY_NOTICES, both fixtures and reference/location JSON.
- `release/pptx-font-locator-0.1.0-source.zip`: explicit authored source/lockfile/tests/fixtures/review allowlist; no .git, node_modules, work, generated demo module or private imports.
- `release/manifest.json` and SHA-256 sidecars, plus unpacked `release/pptx-font-locator/` run files.

Node-only packaging fixes timestamps/file modes and sorts entries. Independent Python ZIP integrity, exact allowlist/per-entry hashes, source-byte equality and two-full-build reproducibility checks cover the local artifacts. No publication, push or history rewrite occurred.


## Screen readability correction — 2026-10-20

Targeted `@media screen` overrides darken reported result qualifiers, source/helper
text and essential labels, with small labels at12px or above. Existing larger
text is retained. Original stylesheet bytes remain an exact prefix; original
non-screen/print rules, application logic, data, tests and fixtures are unchanged.
No core, data or print tests were replayed solely for this CSS change.

Chrome155.0.8059.85 and Firefox153.0 checked the included example/public-data
views at1440,390 and320px. Reported essential text meets the measured solid-color
contrast threshold, and body layout does not overflow. Affected390px views were
visually inspected.
Decorative separators, disabled/hidden text and graphs are distinguished from
material text; this is a bounded screen check, not an accessibility certification.
Sanitized evidence: `verification/screen-readability.json`. The source allowlist
includes this record. Packages were regenerated and checked for deterministic
bytes, exact allowlists and current source equality; current hashes remain in
the release manifest/sidecars.
