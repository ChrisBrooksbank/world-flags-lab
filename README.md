# World Flags Lab

World Flags Lab is an offline-first PWA for learning the flags of the world, connecting them to geography, and testing recall through short practice rounds.

Live app: [https://world-flags-lab.netlify.app](https://world-flags-lab.netlify.app)

GitHub repo: [https://github.com/ChrisBrooksbank/world-flags-lab](https://github.com/ChrisBrooksbank/world-flags-lab)

## Highlights

- Learn country flags with capitals, regions, facts, memory hints, and local flag assets.
- Practice with multiple-choice, reverse flag quiz, blur mode, similar flags, map locator, mistake review, and match mode.
- Explore a 3D globe with country outlines, tappable markers, and country-surface picking.
- Click land on the globe to reveal an expanding flag and country name badge.
- Track mastery, accuracy, weak flags, streaks, recent rounds, and review progress locally.
- Install as a PWA and keep core learning usable offline after first load.
- No account, no ads, and no tracking.

## Screens

- **Home**: daily flag, quick practice, weak flags, and region progress.
- **Learn**: browse countries by region and open detailed country cards.
- **Practice**: low-pressure sessions with instant feedback.
- **Test**: timed exams, map locator, and ultimate mode.
- **Globe**: drag the world, tap markers or countries, and connect flags to place.
- **Atlas**: searchable country table.
- **Progress**: mastery, mistakes, round history, import/export.
- **Settings**: data scope, timers, reduced motion, color assistance, and local reset.

## Globe Explorer

The globe is designed to make country location memorable:

- Country boundary outlines are rendered on a 3D sphere.
- Oceans use a subtle sea texture with depth variation and light wave detail.
- Major oceans are labelled directly on the rotating globe.
- The globe starts still, with optional spin.
- Drag to rotate.
- Pinch on touchscreens or scroll on desktop to zoom into small countries.
- Flag mode textures countries with their flags.
- Hover or tap/click a flag surface or marker to inspect a country in the fixed globe panel.
- Map locator rounds use a labelled mini world map with continent and ocean guides.
- Tap/click land to identify that country and pop out its flag/name.
- Globe modes show flag textures, mastery, or weak countries.

## Local Development

This is a static app with no build step required for normal development.

```bash
npm run serve
```

Then open:

```text
http://localhost:4173/
```

To regenerate country data and local flag assets:

```bash
npm run build:data
```

## Deployment

The app is deployed on Netlify as a static site.

- Production URL: [https://world-flags-lab.netlify.app](https://world-flags-lab.netlify.app)
- Netlify config: [`netlify.toml`](./netlify.toml)
- Publish directory: repository root

Deploy manually with:

```bash
npx netlify deploy --prod --dir .
```

## Data And Assets

The runtime app uses local generated files, so quizzes and the atlas do not depend on live APIs.

- Country data: [`public/data/countries.json`](./public/data/countries.json)
- Flag SVGs: [`public/flags`](./public/flags)
- Country outlines: [`public/maps/countries.geojson`](./public/maps/countries.geojson)
- 3D engine: vendored Three.js module in [`vendor/three.module.js`](./vendor/three.module.js)

The data generator uses REST Countries and downloads SVG flag assets into the repository.

## Project Structure

```text
.
├── index.html
├── manifest.webmanifest
├── sw.js
├── netlify.toml
├── src/
│   ├── app.js
│   └── styles.css
├── public/
│   ├── data/
│   ├── flags/
│   └── maps/
├── scripts/
│   └── build-data.mjs
├── vendor/
│   └── three.module.js
└── FLAGS_PWA_PLAN.md
```

## Privacy

World Flags Lab stores progress in the browser. There is no login, no remote analytics, and no server-side progress storage. Users can export and import their progress JSON from the Progress screen.

Installed PWA updates are detected in-app. When a new service worker is available, the app shows an update prompt; app-shell requests prefer fresh network responses while still falling back to cached files offline.

## Roadmap Ideas

- Better flag symbolism/history per country.
- Richer globe country highlighting after selection.
- Audio pronunciation for countries and capitals.
- Classroom mode with shareable local progress exports.
- Optional multilingual UI.
