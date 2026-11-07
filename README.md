<div align="center">

# Pulsar C5 Labs

**Explore the UNIT PULSAR ESP32-C5HR8 board.**<br>
An interactive guide to the ESP32-C5HR8 and the UNIT PULSAR board, with a complete isometric model, a documented Nano-format pinout and a PDF-linked chip reference. Existing hands-on lessons, simulators and firmware reader remain labeled as ESP32-S3 material while C5 examples are being developed.

[![Open the live guide](https://img.shields.io/badge/open_the_live_guide-GitHub_Pages-1f7a55?style=for-the-badge)](https://unit-electronics-mx.github.io/unit_fork_esp_c5_labs_web/)

[![React 19](https://img.shields.io/badge/React-19.3-149eca?logo=react&logoColor=white)](https://react.dev)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-6.0_strict-3178c6?logo=typescript&logoColor=white)](tsconfig.app.json)
[![Vite 8](https://img.shields.io/badge/Vite-8.3-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![11 languages](https://img.shields.io/badge/languages-11_incl._RTL-b5651d)](docs/I18N.md)
[![CI](https://github.com/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web/actions/workflows/ci.yml/badge.svg)](https://github.com/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web/actions/workflows/ci.yml)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-1f7a55)](CONTRIBUTING.md)
[![MIT License](https://img.shields.io/badge/license-MIT-1f7a55)](LICENSE)

[Live guide](https://unit-electronics-mx.github.io/unit_fork_esp_c5_labs_web/) ·
[Pulsar C5 hardware](https://github.com/UNIT-Electronics-MX/unit_pulsar_esp32_c5) ·
[Legacy ESP32-S3 firmware](https://github.com/agharsallah/esp-labs) ·
[Architecture](docs/ARCHITECTURE.md) ·
[Contributing](CONTRIBUTING.md) ·
[Report a bug](https://github.com/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web/issues/new?template=bug-report.yml) ·
[Propose a lab](https://github.com/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web/issues/new?template=new-lab.yml)

<img src="docs/media/labs-map.gif" alt="Archive screenshot of the original ESP32-S3 labs map and 3D DevKitC-1" width="800">

</div>

> [!IMPORTANT]
> **Migration status:** The home page and Datasheet section now present the Pulsar C5 and ESP32-C5HR8. Lessons, wiring tables, firmware and the bench log still describe the original ESP32-S3 setup. Do not use their pin assignments or flash commands on the Pulsar C5. The [Pulsar C5 hardware repository](https://github.com/UNIT-Electronics-MX/unit_pulsar_esp32_c5) does not yet publish the C++ examples needed to port these labs. The firmware reader and GitHub Pages build therefore continue to use the [original ESP32-S3 firmware](https://github.com/agharsallah/esp-labs).

## Contents

- [What's inside](#whats-inside)
- [The labs](#the-labs)
- [Quick start](#quick-start)
- [How it is built](#how-it-is-built)
- [Contributing](#contributing)
- [Commands](#commands)
- [Configuration](#configuration)
- [Deploy to GitHub Pages](#deploy-to-github-pages)
- [Where things live](#where-things-live)
- [License](#license)

## What's inside

### Every lab runs in the browser first

Each lesson is one sheet: the goal, the pins it uses on a live pinout, the wiring, the command to flash it, the steps to tick off and a simulator of what you should see. Type a command into the simulated serial monitor and the board answers like the real firmware does.

<p align="center"><img src="docs/media/lesson-simulator.gif" alt="Lesson 02: ticking off steps, then typing blink, sos and level commands into the serial monitor while the simulated LED follows" width="800"></p>

### A code reader that never overwhelms

**Read the code** opens the real firmware the lab flashes, taken from [esp-labs](https://github.com/agharsallah/esp-labs) at build time. **Tour** walks it a few lines at a time and asks you to guess first. **Story** follows the program as it runs, from `setup()` into every call. **Explore** explains any line you tap. New C++ words come up three at a time, and the phrasebook remembers the ones you've already met.

<p align="center"><img src="docs/media/code-reader.gif" alt="The code reader: tour stops with guess-first quizzes and new-word cards, then the Story mode following setup()" width="800"></p>

### The datasheet, made for makers

The **Datasheet** section ([`#/datasheet`](https://unit-electronics-mx.github.io/unit_fork_esp_c5_labs_web/#/datasheet)) now covers the ESP32-C5HR8. It starts with the complete isometric Pulsar C5 model, then explains the two RISC-V CPUs, memory, board pins and on-chip peripherals. Each chip fact links directly to a page of the bundled [ESP32-C5 Series Datasheet v1.5](public/esp32-c5_datasheet_en.pdf). **Read PDF** offers chapter shortcuts, an embedded viewer and a link to Espressif's current publication. The new reference text is available in English and Spanish; other interface languages fall back to English for this section.

The board pinout follows UNIT's [Pulsar C5 hardware reference](https://github.com/UNIT-Electronics-MX/unit_pulsar_esp32_c5). D2/RGB is marked as unverified because the pinout artwork and schematic disagree about its GPIO.

### In your language, on your phone

The guide is in English, French, Spanish, Italian, German, Polish, Turkish, Chinese (Simplified and Traditional), Japanese and Arabic (right to left). Add `?lang=fr` to any link to share it in a language. It works on a phone at 390 px, in light and dark themes, and respects reduced motion.

<table>
  <tr>
    <td width="70%"><img src="docs/media/languages.gif" alt="Switching the guide from English to French, Japanese and Arabic, where the whole layout mirrors right to left"></td>
    <td width="30%"><img src="docs/media/phone-dark.gif" alt="The guide on a phone in dark mode: the labs map, then the S5 spectrum lesson and its simulator"></td>
  </tr>
</table>

### Also inside

- **Meet the board**: the Pulsar C5 in 3D with component descriptions and a Nano-format GPIO reference.
- **The bench log**: what is flashed on the board right now and every command recorded. It is plain JSON in `public/data/`, so you can update it without a rebuild.
- **Progress**: your ticks, the last lesson you opened and the variants you picked stay in your browser, with no account.
- **The parts library** at [`#/parts`](https://unit-electronics-mx.github.io/unit_fork_esp_c5_labs_web/#/parts): 42 isometric drawings of every component on the bench, coloured from design tokens only.

## The labs

| Theme             | Labs                                                                                       | What you build                                          |
| ----------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| **Intro**         | 00 Setup · 01 Hello · 02 First circuit                                                     | The toolchain, your first program, an LED you command   |
| **Display & input** | 03 Display · 03b Showcase                                                                | The 1.9″ TFT and the buttons                            |
| **Wi-Fi**         | W1 Scan & join · W2 Phone control · W3 Internet & AI · *W4, W5 planned*                    | Scanning, a web page on the board, APIs over HTTPS      |
| **RFID & NFC**    | R1 Wire & talk → R8 Card friends                                                           | The 13.56 MHz field, card memory, a door with card admin |
| **Bluetooth LE**  | B1 Listen → B8 Host                                                                        | Advertising, pairing, a phone app, a keyboard, music    |
| **Sound**         | S1 Hear → S8 Voice FX                                                                      | Loudness, clap control, a recorder, a spectrum, a speaker |
| **Sensors**       | *planned*                                                                                  | Temperature, air and motion over I2C                    |

The firmware for every lab is a standalone PlatformIO project in [esp-labs](https://github.com/agharsallah/esp-labs). Each lesson links to its folder on GitHub.

## Quick start

You need **Node 24.14+** and **pnpm 11** (`corepack enable` gives you the pinned version). The code reader shows the firmware from a sibling checkout of `esp-labs`, so clone both repos side by side:

```sh
git clone https://github.com/agharsallah/esp-labs.git
git clone https://github.com/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web.git
cd unit_fork_esp_c5_labs_web
pnpm install
pnpm dev              # http://localhost:5180
```

Without `../esp-labs`, everything else still works: the lessons, the simulators and the bench log. Only the code reader has nothing to show. Point `FIRMWARE_DIR` elsewhere if your checkout lives somewhere else ([Configuration](#configuration)).

## How it is built

React 19 with React Compiler, React Router 8 (data mode, hash URLs), TanStack Query 5, zod 4, i18next, three.js, CSS Modules and design tokens, built by Vite 8. Lessons are data, simulators are lazily loaded widgets, and the bench log is JSON fetched at run time.

```mermaid
flowchart LR
  url["#/lessons/R3"] --> loader["route loader"] --> query["TanStack Query cache"]
  query --> content["lesson content<br/>(one chunk per track)"]
  query --> data["public/data/*.json<br/>(bench status + log)"]
  loader --> page["LessonPage"] --> slot["WidgetSlot<br/>(lazy + error boundary)"] --> sim["simulator / diagram"]
```

The full picture: layers, the widget contract, the three simulator rules, the lab-screen engine and the code reader. It's all in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**. How text and translations work is in **[docs/I18N.md](docs/I18N.md)**.

## Contributing

Contributions of every size are welcome. These need no React at all:

| You want to…                          | Start here                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Report something broken               | [Bug report](https://github.com/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web/issues/new?template=bug-report.yml)                       |
| Suggest a lab or a theme              | [Lab proposal](https://github.com/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web/issues/new?template=new-lab.yml)                        |
| Fix or improve a translation          | [Translation issue](https://github.com/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web/issues/new?template=translation.yml) or edit `src/locales/<lang>/` |
| Fix a typo or a confusing step        | Edit the lesson in `src/content/lessons/<track>.ts` and open a PR                                                  |
| Add a lab, a simulator or a language  | [CONTRIBUTING.md](CONTRIBUTING.md): step by step, with the checks to run                                          |

Issues labelled [`good first issue`](https://github.com/UNIT-Electronics-MX/unit_fork_esp_c5_labs_web/labels/good%20first%20issue) are a good place to start. Please read the [code of conduct](CODE_OF_CONDUCT.md); report security problems privately ([SECURITY.md](SECURITY.md)). How CI and the review rules work: [docs/MAINTAINING.md](docs/MAINTAINING.md).

## Commands

Run them from this folder.

```sh
pnpm install          # once
pnpm dev              # http://localhost:5180
pnpm check            # typecheck + lint + tests
pnpm i18n:extract     # regenerate the English content catalogues after editing lessons
pnpm build            # static bundle in dist/ (relative paths: serve it from any folder)
pnpm preview          # serve dist/ locally (browsers will not run module scripts from file://)
```

## Configuration

Copy `.env.example` to `.env` to override:

| Variable               | Default                                               | Meaning                                                       |
| ---------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| `VITE_BENCH_DATA_URL`  | `./data/`                                             | Where `bench-status.json` and `bench-log.json` are read       |
| `VITE_FIRMWARE_URL`    | `./firmware/`                                         | Where the bundled lab code is read                            |
| `VITE_LABS_SOURCE_URL` | `https://github.com/agharsallah/esp-labs/tree/main/labs/` | Where each lesson's "code on GitHub" link points          |
| `VITE_LOG_LEVEL`       | `info`                                                | `debug`, `info`, `warn`, `error` or `silent`                  |
| `FIRMWARE_DIR`         | `../esp-labs`                                         | Build time only: the firmware checkout the code reader shows  |
| `REFERENCE_FILE`       | `docs-llm/esp32-s3/ESP32-S3_REFERENCE.md`             | Legacy S3 reference build input; the visible C5 datasheet uses the bundled PDF |
| `VITE_REFERENCE_URL`   | `./reference/`                                        | Legacy S3 reference asset path |

## Deploy to GitHub Pages

<details>
<summary>Manual production deploys and GitHub releases</summary>

<br>

The app uses relative asset paths and a hash router, so it works under the repository's Pages path without rewrite rules. The [Deploy](.github/workflows/deploy.yml) workflow checks out the guide and the sibling `esp-labs` firmware, runs lint, citation checks and tests, builds with `pnpm build`, uploads `dist/` to GitHub Pages and publishes a GitHub release with the deployed URL. It refuses any branch other than `main`. Merging to `main` does not deploy.

If GitHub asks you to enable Actions in this fork, do that on the **Actions** tab. In repository **Settings → Pages**, choose **GitHub Actions** as the build and deployment source once. Then run **Actions → Deploy → Run workflow** on `main`, or:

```sh
gh workflow run Deploy --ref main
```

The workflow uses GitHub's built-in token; no Vercel account, token or project variables are needed. The deployed URL is [GitHub Pages](https://unit-electronics-mx.github.io/unit_fork_esp_c5_labs_web/). See [production deploys](docs/MAINTAINING.md#production-deploys) for environment protection and rollback instructions. GitHub Pages has no preview deployments in this workflow.

</details>

## Where things live

<details>
<summary>A map of the source tree</summary>

<br>

| Path                        | What                                                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/content/`              | Tracks (table of contents) and lessons, one file per track; `code/` holds the phrasebook and hand-written code tours |
| `src/domain/`               | Pure, tested logic: the lesson model, progress, the board, the C++ analyser and tour builder (`code/`)               |
| `src/labs/<track>/`         | That track's simulators and explainers, registered in `widgets.ts`                                                   |
| `src/labs/shared/`          | `Simulation` and the lab-screen engine (screen + buttons + serial)                                                   |
| `src/features/`             | App screens: labs map, lesson sheet and dock, navigation, board pinout, code reader, bench log, settings, progress   |
| `src/features/c5-datasheet/` | The visible C5 datasheet pages, source links and board viewer                                            |
| `src/features/chip/`, `src/content/chip/` | Legacy S3 reference source, no longer routed into the visible datasheet                         |
| `src/features/reference/`   | Legacy S3 reference reader source                                                                                    |
| `src/ui/`                   | Design-system pieces: Panel, Button, Terminal, SequenceDiagram, RichText…                                            |
| `src/ui/parts/`             | The parts library: isometric illustrations of every component (`<PartIcon name="led" />`), gallery at `#/parts`      |
| `src/ui/stage3d/`           | The shared 3D stage (three.js): orbit camera, toolbar, leaders, ink outlines, toon materials                         |
| `src/i18n/`, `src/locales/` | Language setup and translations, one folder per language: see [docs/I18N.md](docs/I18N.md)                           |
| `src/lib/`                  | Logger, storage, theme, palette, animation loop, http, clipboard                                                     |
| `src/styles/tokens.css`     | Every colour, font and radius; light and dark themes                                                                 |
| `tools/firmware/`           | Reads `esp-labs` (or an old `test-esp`) and ships each env's code as JSON (Vite plugin)                              |
| `tools/reference/`          | Splits the reference into typed sections and emits them as JSON (Vite plugin, only when `REFERENCE_FILE` exists)     |
| `public/data/`              | Bench status and log (validated with zod when fetched)                                                               |
| `docs-llm/`                 | Offline React, React Router and TanStack Query docs used to build this (fetched, git-ignored)                        |

</details>

### Versions

All dependencies are pinned exactly (`savePrefix: ""`): React 19.3, React Router 8.4, TanStack Query 5.104, Vite 8.3, React Compiler 1.0, zod 4.6, three 0.186, i18next 26.4. TypeScript stays on 6.0 because typescript-eslint does not support TypeScript 7 yet.

## License

Open source under the [MIT License](LICENSE). In one line: **do what you like with it, just credit the original work.**

**You can**

- use it for anything: learning, teaching, workshops, your job, commercial products
- change it, fork it, build on it, mix it into your own projects
- deploy it, host it, share it, sell it

**You must**

- keep the copyright notice and the [LICENSE](LICENSE) text in any copy or substantial part of the code you pass on. That is how the original work stays credited.

**We ask (not required, but appreciated)**

- if you deploy a version of it, say where it comes from somewhere visible, such as the footer or an about page:

  ```text
  Based on ESP32 Labs by Abderrehmen Gharsallah: https://github.com/agharsallah/esp-labs-web
  ```

**Good to know**

- You don't need to ask permission or tell anyone.
- Your own changes can carry any license you choose, as long as the original notice stays with the original code.
- It comes as is: no warranty, and the authors aren't liable for what you do with it.
- Third-party libraries keep their own licenses, and the firmware in [esp-labs](https://github.com/agharsallah/esp-labs) has its own.
- Espressif, ESP32 and other product names are trademarks of their owners; the license covers this code, not those names.

This summary is a plain-language guide; the [LICENSE](LICENSE) file is the legal text and wins if they ever differ.

---

<sub>A learning project, not affiliated with Espressif. The Pulsar C5 pin layout follows UNIT's hardware reference V1.2.3; verify the labels and connections on your board.</sub>
