# WebScope — Visual CSS Inspector & Extractor

A free, offline-capable Chrome/Chromium **Manifest V3** browser extension built with **WXT**, **React**, **TypeScript**, and **Tailwind CSS**.

WebScope gives designers and frontend developers a visual Side Panel workspace to inspect and edit live page styles, scan full pages, extract design tokens and assets, check WCAG contrast, and export clean HTML/CSS, Tailwind CSS, or React JSX with a live **Real View** preview.

---

## Features

- **Live Element Inspector & Real-Time Style Editor**
  - Shadow DOM box-model overlay (`margin`, `padding`, `content`, element label & font badge) with zero style leakage onto host pages.
  - Edit box-model spacing, layout (`display`, `position`, `flex`, `gap`), typography, colors, borders, and shadows live in the Chrome Side Panel.
  - Step-by-step **Undo** and **Reset** for all live overrides, plus DOM breadcrumb & child navigation (`Alt + ↑ / ↓`, `Esc` to exit picking).
- **Full-Page Scanner (`Page` tab)**
  - Scans the entire DOM (no element cap) to list semantic page sections (`header`, `nav`, `main`, `section`, `article`, `aside`, `footer`) with hover-to-highlight, **Inspect**, and **Code** actions.
  - Audits the full page for WCAG AA text contrast issues.
- **Deterministic Web-to-Code & Live "Real View" (`Code` tab)**
  - Export either the **Selected Element** or the **Full Page** (`body`) into **Tailwind**, **React JSX**, or **HTML + CSS**—100% locally with zero API keys.
  - Captures UA-diffed CSS properties, `::before`/`::after` pseudo-elements, `@font-face` rules, SVG `<symbol>` sprites, and `<canvas>` snapshots while skipping hidden `display: none` menus and third-party extension attributes.
  - Toggle between **Real View** (sandboxed live rendered `<iframe>` with scaled desktop viewport, `Fit`, `375px` mobile, **Open in Tab**, and **Download `.html`**), **Code**, and **Split**.
- **Design Token Extractor (`Tokens` tab)**
  - Extracts page colors, font families/weights/sizes, spacing values, border radii, shadows, and `:root` CSS variables.
  - Exports tokens as **CSS Variables**, **Tailwind Config**, **`DESIGN.md`**, or **JSON**.
- **Asset Extractor (`Assets` tab)**
  - Finds `<img>`, inline `<svg>`, `<video>`, `<audio>`, and CSS `background-image` assets with one-click download or SVG markup copy.

---

## Tech Stack

- [WXT](https://wxt.dev/) (Manifest V3 extension framework)
- React 19 + TypeScript
- Tailwind CSS v4 + Lucide Icons
- Vitest + jsdom (unit tests)

---

## Getting Started

### Prerequisites
- Node.js 20+ and npm

### Install & Build

```bash
npm install
npm run build
```

This generates the unpacked Chrome extension in `.output/chrome-mv3/`.

### Load in Chrome / Chromium (Chrome, Brave, Edge, Arc)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select `.output/chrome-mv3`
4. Open any regular webpage (`https://...`), click the **WebScope** toolbar icon to open the Side Panel, and click **Pick Element** or **Scan Full Page**.

---

## Development & Testing

```bash
# Start WXT dev server with hot reload
npm run dev

# Run TypeScript typechecking
npm run typecheck

# Run unit tests
npm test

# Create distributable .zip archive
npm run zip
```

---

## Project Structure

```text
entrypoints/
  background.ts                  # On-demand scripting injection, downloads, message relay
  inspector.content.ts           # Shadow DOM overlay + DOM extraction/mutation handlers
  sidepanel/                     # React Side Panel UI (Inspect, Page, Code, Tokens, Assets)
src/
  core/
    css-capture.ts               # UA-default diffing, pseudo-elements, fonts, SVG sprites
    inspector-snapshot.ts        # Box model & computed style snapshot builder
    page-scanner.ts              # Full-page DOM, section, and WCAG contrast scanner
    selector.ts                  # Unique CSS selector builder & resolver
    style-mutator.ts             # Live style override manager with undo/reset stack
    style-to-tailwind.ts         # Deterministic HTML/CSS, Tailwind, React JSX & Real View exporter
    token-and-asset-extractor.ts # Page token & asset extraction + formatters
    wcag.ts                      # Color parsing, alpha compositing & WCAG contrast math
  shared/
    types.ts                     # Shared TypeScript interfaces & message contracts
tests/                           # Vitest + jsdom unit tests
```
