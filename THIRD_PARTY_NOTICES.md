# Third-party notices

Runtime dependency: **fflate 0.8.3**, copyright (c) 2020 Arjun Barrett, MIT License. Source: https://github.com/101arrowz/fflate . The full MIT license is retained in `node_modules/fflate/LICENSE` after `npm ci`; a bundled copy follows below. This tool uses fflate's raw streaming Inflate, not its ZIP reader. ZIP container validation and output bounds are implemented locally.

Build/test tools: Vite (MIT, with a bundled helper covered below), TypeScript (Apache-2.0), Vitest (MIT), jsdom (MIT), tsx (MIT) and their transitive dependencies. Package-lock.json pins installed versions and retains dependency license metadata. No downloaded images, web fonts, icon library, proprietary slides, or competitor source code are included. UI uses system fonts and original CSS. All fixture XML is original synthetic test material created for this tool.

## fflate license

Copyright (c) 2020 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## Diagnostic fixture provenance

`public/synthetic-fonts.pptx` is generated from original `scripts/fixture-source.ts`. The separate `verification/fixtures/independent-master-font.pptx` began as an original synthetic presentation exported by the bundled artifact tool, then received two intentionally inserted hidden master declarations. Independent reference/location JSON accompanies it. These fixtures are original project test material under the project MIT licence; they contain no customer material or embedded font binaries. Font names such as Aptos are stored declarations, not distributed font software. Neither fixture establishes Microsoft PowerPoint native interoperability or rendering.


## Bundled Vite module-preload helper

The compiled HTML/JavaScript includes Vite's module-preload helper. Vite is used for building, and this small helper is also distributed in the runnable artifact. Its core MIT notice is retained here.

# Vite core license
Vite is released under the MIT license:

MIT License

Copyright (c) 2019-present, VoidZero Inc. and Vite contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
