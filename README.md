# PPTX Font Locator

**Open the tool: https://kotijekriv.github.io/pptx-font-locator/** · [Downloads (offline HTML and source)](https://github.com/kotijekriv/pptx-font-locator/releases/tag/v0.1.0)

Experimental browser-local inventory of stored PowerPoint font references. Open an unencrypted `.pptx`, optionally filter by a font name, then inspect the slide/master/layout/notes location, shape and placeholder identifiers, list level, ZIP part and exact XML breadcrumb. Export matching references as JSON or spreadsheet-safe CSV.

The useful narrow case is a font stored in an unused list level: the included original synthetic package has Ghost Sans in empty levels 2–5 of a slide shape and level 3 of a master body style. Existing tools include Slidewise, ShowFonts and Stoatworks. This project makes no novelty, superiority, market-validation or repair-success claim.

## Open the local package

After `npm run package`, extract `release/pptx-font-locator-0.1.0.zip` and open `pptx-font-locator/pptx-font-locator-standalone.html`. It runs directly without a server or network connection, including the embedded synthetic example. The package includes both original diagnostic fixtures, their independent reference/location oracles, README and licence notices. The separate source ZIP contains editable allowlisted source, lockfile, tests and verification records, without Git history or user imports. Both archives, with SHA-256 sidecars, are attached to the [v0.1.0 release](https://github.com/kotijekriv/pptx-font-locator/releases/tag/v0.1.0); the hosted page is the same standalone HTML file.

## Run locally

Node 22.12+ (verified with Node 26.12.0), npm.

```sh
npm ci
npm test
npm run build
npm run dev
```

Open http://127.0.0.1:4315/ and choose **Try the synthetic example** or a local `.pptx`. `npm run dev` binds loopback only. Production output is the static `dist/` folder and self-contained `dist/pptx-font-locator-standalone.html`. Open the standalone HTML directly at file://; serve the ordinary index/assets over HTTP. `prebuild` and `predev` regenerate the deterministic original demo and embedded source automatically. No backend, telemetry, accounts, file uploads, or persistent browser storage are configured. The GitHub Pages copy is the same standalone HTML file.

## Interpret results

- **Explicit** means a nonempty DrawingML `@typeface` declaration, including Latin, East Asian, complex-script, symbol, bullet and alternate-script font declarations.
- **Theme token** means a value beginning `+`. Recognized `+mj-lt`, `+mn-lt`, `+mj-ea`, `+mn-ea`, `+mj-cs` and `+mn-cs` values map only when a unique nonempty declaration can be found through package relationships. Language fallback and effective rendering remain unresolved. Empty East Asian declarations do not become an invented font.
- **Style declaration** can apply to unused or empty text. It does not establish that PowerPoint renders that font. The tool scans XML parts under `ppt/`, including orphaned parts, selected by declared XML content type with a case-insensitive `.xml` extension fallback. Content-typed XML with a custom extension is included; relationships are parsed separately.
- Slide numbering follows the presentation's slide relationship order. Unlinked slide parts appear under Other XML. Master/layout numbering is a package filename, not a guessed PowerPoint UI name.
- Breadcrumbs normalize known namespaces to `a:` (DrawingML) and `p:` (PresentationML). Every component has a one-based index among same-name siblings. Namespace-prefix variants produce the same breadcrumb. Shape IDs and placeholder indices come from XML.
- Exports contain the active filter and matching rows (JSON includes scope/warnings). CSV quotes every data field and prefixes leading spreadsheet formula markers with an apostrophe. Original values remain available in JSON.

Use PowerPoint's Slide Master or Notes Master views to find matching placeholders/styles. XML paths are precise package references, not clickable editing commands. The tool never changes the presentation.

## Limits and unsupported cases

A successful scan means the bounded declaration inventory completed. It does **not** verify installed/missing fonts, embedded font contents, effective font inheritance, visual use, successful repair, rendering fidelity, or complete font coverage inside embedded objects.

Supported package format: ordinary unencrypted PPTX ZIP, stored/deflated entries, UTF-8 XML, transitional and strict DrawingML/PresentationML namespaces. Legacy PPT, PPTM, encrypted Office containers/ZIP entries, ZIP64, split ZIPs, DTD/entity declarations and other encodings are unsupported. OPC package URIs with percent-encoded relationship targets are not normalized, so related theme mappings may remain unresolved.

Bounds: input 40 MiB; 3,000 ZIP entries; 8 MiB per expanded entry; 80 MiB total expansion; 2 MiB per XML part; 16 MiB total parsed XML; 200,000 elements; XML depth 100; 30,000 font references. Only 250 matching references render at once; export includes every match. Expansion is incrementally bounded even when a ZIP entry lies about its size. ZIP CRC is checked. Excessive/invalid input produces LIMITED, UNSUPPORTED or INVALID, without a misleading partial success. Parsing runs on the main thread within these limits and can briefly block on larger supported decks.

XML values are rendered with `textContent`. PPTX files are kept only in memory for the current scan; selecting another file replaces the report. The original synthetic demo is embedded in the compiled app; using it performs no network request. A new input invalidates every earlier asynchronous read and animation-frame continuation. CSV/JSON exports are separate reports, not rewritten presentations.

## Evidence and provenance

`scripts/fixture-source.ts` creates original structural PPTX fixtures; `public/synthetic-fonts.pptx` is checked in for the one-click demo. These are diagnostic ZIP/XML fixtures, not a designed presentation or a deck validated in PowerPoint. The tests exercise text paragraphs, hidden list levels 2–5, notes/master/layout/theme/alternate scripts, exact paths, prefix changes, malformed/unsupported packages, decompression bounds, escaping and unchanged bytes. No real customer deck is included.

A separate original artifact-tool-exported fixture has 363 references confirmed against an independent XPath oracle, including two intentionally inserted hidden master level-3 references. Both fixtures contain font names/declarations, not embedded font binaries, and neither has been opened in Microsoft PowerPoint. Current review and continuation details are in HANDOFF.md and `verification/review-2026-10-20.md`. No native interoperability or customer correction is established.


## Reproduce packages and browser regressions

```sh
npm run package
```

This rebuilds the app and writes run/source ZIPs, `release/manifest.json` and SHA-256 sidecars. Node-only packaging uses explicit allowlists, fixed ZIP timestamps and file modes, sorted paths, and private-path/credential-shaped checks. Repeated full builds with unchanged inputs produce identical artifacts. The ignored generated `src/demo.generated.ts` is recreated by the fixture prebuild step and is not needed in the source ZIP.

The optional integration regression requires external Playwright and browsers already installed by the developer; it downloads no browser:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright BROWSER_ENGINE=chrome npm run test:browser
PLAYWRIGHT_MODULE=/path/to/playwright BROWSER_ENGINE=firefox npm run test:browser
```

`PLAYWRIGHT_BROWSERS_PATH` may identify an existing browser location. The regression runs the standalone file with networking offline and checks demo18/filter5, the independent363-reference multiset, both exact hidden paths, JSON export, malformed input, keyboard/mobile behavior and obsolete animation-frame/local-file/demo-file continuations. Final Chrome155 and Firefox153 checks captured no page errors or HTTP requests. Deferred reads and animation callbacks are controlled probes, not real-world latency measurements.
