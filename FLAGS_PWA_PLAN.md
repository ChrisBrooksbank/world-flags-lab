# World Flags Learning PWA Plan

## Goal

Build a progressive web app that helps a learner recognize every world flag, understand the context behind each flag, locate the country on a map, and then prove retention through progressively harder tests.

The app should feel like a study tool first and a quiz game second: fast, offline-capable, motivating, and useful for repeated short sessions.

## Research Summary

I reviewed current flag and geography learning apps to identify strong features worth borrowing and gaps this PWA can fill.

| Product | Useful observed features | Takeaways for this PWA |
| --- | --- | --- |
| [Flags of the World Best Trivia](https://apps.apple.com/us/app/flags-of-the-world-best-trivia/id1202995075) | Progressive levels, flashcards, 20-second quiz questions, multiple quiz types, capitals/currencies/populations, multiplayer, global leaderboards, many languages. User reviews specifically value difficulty progression and similar-flag challenges, but mention ads and wish for more flag symbolism/history. | Use progressive unlocks, flashcards, similar-flag comparison, and extra facts. Avoid disruptive ads. Make symbolism and flag-ratio details a first-class learning feature. |
| [Flag Learn](https://www.flaglearn.eu/) | Learning path, daily flag, daily map hunt, speedruns, map locator, PvP, blur mode, country wheel, higher/lower population or area, ultimate mode combining map, country, and capital. Uses Flagpedia, REST Countries, and WorldPop. | Strong model for varied retrieval practice. Combine flag recognition with map location and country knowledge. Add daily modes to build habit. |
| [Flag Quiz](https://www.vlaggenquiz.nl/) | Browser-based, no sign-up, 4-answer quizzes, 20-second timer, faster answers score more, solo and two-player duel, 11 languages. | Keep first-run friction low. Four-choice timed quiz is a good baseline mode. Scoring should reward speed but not punish learning mode. |
| [Flag Match](https://flagmatch.com/) | Match flags to countries, world and continent filters, 236 flags, hints, pause, streaks, accuracy, time, shareable results, leaderboard. | Matching mode is more playful than repeated multiple choice. Track accuracy, max streak, and time. Include hints with a scoring cost. |
| [Seterra](https://online.seterra.com/) | Large library of geography quizzes, customizable map challenges, long-running educational reputation, many languages. | Map-based tests should be customizable by region and difficulty, not just a novelty panel after each question. |
| [Flagtastic](https://apptastic.no/flagtastic/) | Dynamic quiz generation, configurable quiz length/difficulty/themes, continent categories, review mode, personal stats, high scores. | Let users tune session length and difficulty. Always provide review mode for mistakes. |
| [Flags of All World Countries](https://apps.apple.com/us/app/flags-of-all-world-countries/id897716622) | Includes independent countries plus territories, hints, user-friendly feedback, 30 languages. Reviews ask for filtering non-UN or dependent territories. | Data scope should be explicit and filterable: UN members, sovereign states, dependencies, disputed/observer entities. |

## Product Positioning

Most flag apps are either quick trivia games or broad geography quiz collections. This PWA should sit between them:

- It teaches recognition through spaced repetition, not only random quizzes.
- It explains why flags look the way they do using short facts, symbolism, ratios, and lookalike comparisons.
- It connects every flag to geography with a small map view and dedicated map tests.
- It works offline after first load.
- It respects the learner: no account required, no ads, no dark patterns.

## Target Learners

- Students preparing for school geography tests.
- Trivia players who want to master flags efficiently.
- Travelers and curious adults who want cultural/geographic context.
- Parents or teachers who need a safe, simple classroom-friendly web app.

## Core Learning Loops

### 1. Learn

The learner browses a region or learning deck. Each country card shows:

- Flag image at correct ratio.
- Country name, capital, continent/region.
- Small map crop showing the country in context.
- Short "remember this" clue.
- Symbolism and design notes.
- Similar flags or common confusions.
- Basic facts: population, area, currency, languages.
- Optional audio pronunciation of country/capital.

### 2. Practice

Low-pressure sessions that give feedback immediately.

- Flashcards: flag on front, reveal country and facts.
- Multiple choice: identify country from flag.
- Reverse quiz: identify flag from country name.
- Similar flags drill: choose between lookalikes, e.g. Chad/Romania, Indonesia/Monaco, Ireland/Ivory Coast.
- Map helper: after each answer, show the country highlighted on a mini map.
- Mistake review queue: missed countries come back soon.

### 3. Test

Higher-pressure recall with scoring and post-round review.

- Timed quiz: 10, 20, 50, or all countries.
- Continent exams.
- World exam.
- Map locator: tap/click the country on a map after seeing its flag.
- Ultimate mode: name the country, locate it, then answer capital or fact.
- Final review screen with misses, slow answers, confusions, and suggested next deck.

### 4. Retain

Daily and long-term habit mechanics.

- Daily Flag: one new/review flag with a fact.
- Daily Map Hunt: locate one highlighted or hinted country.
- Streaks based on meaningful study completion, not app opens.
- Spaced repetition scheduler: "new", "learning", "review", "mastered".
- Personal weak-list: countries sorted by miss rate and average answer time.

## Information Architecture

First screen should be the usable learning dashboard, not a marketing landing page.

- Home
  - Continue learning
  - Daily challenge
  - Weak flags
  - Region progress
- Learn
  - World
  - Africa
  - Asia
  - Europe
  - North America
  - South America
  - Oceania
  - Optional: UN only, all sovereign states, territories
- Practice
  - Flashcards
  - Multiple choice
  - Reverse quiz
  - Match mode
  - Similar flags
  - Blur/silhouette mode
- Test
  - Timed round
  - Region exam
  - Map locator
  - Ultimate mode
- Atlas
  - Search countries
  - Country detail pages
  - Compare flags
- Progress
  - Mastery map
  - Streaks
  - Accuracy over time
  - Mistake review
- Settings
  - Data scope
  - Languages
  - Timer on/off
  - Sound on/off
  - Reduced motion
  - Color-blind support
  - Reset progress/export data

## MVP Feature Set

The first version should be small enough to build well.

### Must Have

- PWA installability with offline support.
- Country dataset for UN member states plus a clearly labelled option for observer states/territories later.
- Region browser.
- Country detail card with flag, capital, region, map crop, and concise facts.
- Multiple choice quiz: flag to country.
- Reverse quiz: country to flag.
- Timed and untimed modes.
- Mistake review.
- Local progress stored on device.
- Map crop/highlight on answer reveal and country detail.
- Basic spaced repetition based on answer correctness and confidence.

### Should Have

- Similar-flag drills.
- Match mode.
- Daily flag.
- Achievement badges for mastery milestones.
- Import/export progress JSON.
- Teacher/classroom mode with no account and no tracking.

### Could Have Later

- Multiplayer/duel mode.
- Global leaderboard.
- User-created quiz sets.
- Audio pronunciations.
- Rich flag history articles.
- Native wrapper for app stores.

## Quiz Modes

### Multiple Choice

Prompt: show a flag, choose from 4 country names.

Rules:

- Distractors should be intelligent, not random.
- Prefer same continent distractors.
- For advanced rounds, include visually similar flags.
- Show instant feedback.
- Reveal map and one fact after answering.
- In learning mode, no timer.
- In test mode, timer and score.

### Reverse Quiz

Prompt: show country name, choose from 4 flags.

Purpose:

- Forces visual discrimination.
- Good for learners who recognize names but cannot picture the flag.

### Match Mode

Prompt: show a grid of flags and country names, match pairs.

Rules:

- 6, 10, or 16 pairs.
- Hints reveal one pair with a score penalty.
- Track time, accuracy, and max streak.

### Similar Flags Drill

Prompt: compare 2 to 4 similar flags.

Examples:

- Romania vs Chad.
- Monaco vs Indonesia.
- Poland vs Indonesia.
- Ireland vs Ivory Coast.
- Australia vs New Zealand.
- Slovenia vs Slovakia.
- Netherlands vs Luxembourg.

Teaching angle:

- Highlight distinguishing details after answer.
- Mention aspect ratio when relevant.
- Offer a "compare" view with labels and zoom.

### Map Locator

Prompt: show a flag and ask the user to click/tap the country.

Implementation:

- Use simplified world GeoJSON.
- Start with continent-level maps for usability.
- Accept clicks within the country polygon.
- For tiny countries, support enlarged inset maps or generous tap targets.

### Ultimate Mode

Prompt sequence:

1. Identify country from flag.
2. Locate it on the map.
3. Answer capital, region, or flag fact.

Use this as a capstone test after a region is mostly mastered.

## Learning Content

Each country should eventually have:

- `nameCommon`
- `nameOfficial`
- `iso2`
- `iso3`
- `region`
- `subregion`
- `capital`
- `population`
- `areaKm2`
- `currency`
- `languages`
- `flagSvgPath`
- `flagAspectRatio`
- `mapCentroid`
- `mapBounds`
- `neighborIso3`
- `flagFacts`
- `symbolism`
- `memoryHint`
- `similarFlagIso3`
- `difficulty`
- `isUNMember`
- `entityType`

Example country content shape:

```json
{
  "iso3": "JPN",
  "nameCommon": "Japan",
  "capital": "Tokyo",
  "region": "Asia",
  "flagAspectRatio": "2:3",
  "memoryHint": "A red sun disc on white: Japan is often called the Land of the Rising Sun.",
  "symbolism": ["The red disc represents the sun."],
  "similarFlagIso3": ["BGD", "PLW"]
}
```

## Data Sources

Recommended approach: build a local generated dataset instead of depending on live APIs at runtime.

- Country facts: [REST Countries](https://restcountries.com/) for names, capitals, currencies, languages, regions, population, area, and flag links.
- Flag assets: [Flagpedia](https://flagpedia.net/) or local SVG assets generated from reliable ISO code mappings. Flagpedia offers flag assets and is used by other flag-learning apps.
- Map data: [Natural Earth](https://www.naturalearthdata.com/) via GeoJSON. Natural Earth is free/public-domain map data suitable for web maps.
- Supplemental facts: curated manually from official/public sources where possible. Avoid relying on generated facts without review.

Runtime should not require network access for core learning, quizzes, maps, or progress.

## Technical Architecture

### Suggested Stack

- Framework: React + Vite or SvelteKit.
- Language: TypeScript.
- Styling: CSS modules or Tailwind, depending on project preference.
- PWA: Vite PWA plugin or Workbox.
- Map rendering: SVG with D3 geo projection for lightweight offline maps, or MapLibre only if richer pan/zoom is needed.
- State: local app store such as Zustand, Redux Toolkit, or Svelte stores.
- Storage: IndexedDB for progress and cached datasets, with localStorage only for small settings.
- Testing: Vitest for logic; Playwright for quiz/map flows and PWA smoke tests.

### Offline Strategy

- Precache app shell, country dataset, flag SVGs, and low-resolution map GeoJSON.
- Lazy-cache high-resolution map data and optional images.
- Keep all quiz functionality available offline.
- Store progress locally first.
- Optional future sync can be additive, not required.

### Data Build Pipeline

Create scripts that:

1. Fetch country data from REST Countries.
2. Normalize country names and ISO codes.
3. Download/validate flag SVG assets.
4. Join countries to Natural Earth polygons by ISO code.
5. Generate centroid and bounds for map crops.
6. Add curated facts and similar-flag groups.
7. Emit versioned JSON files:
   - `countries.min.json`
   - `countries.full.json`
   - `world-110m.json`
   - `regions/*.json`

Add validation checks:

- Every quiz-eligible country has a flag.
- Every map-eligible country has a polygon or fallback point.
- Every country has a display name, ISO code, region, and capital where applicable.
- Similar-flag references point to existing countries.

## Scoring And Progress

### Mastery Score

Track mastery per country rather than only global score.

Inputs:

- Correct/incorrect answers.
- Time to answer.
- Hint usage.
- Confidence rating after flashcards.
- Recency.
- Mistake streaks.

Simple MVP formula:

- Correct fast answer: +12 mastery.
- Correct slow answer: +7 mastery.
- Correct with hint: +3 mastery.
- Incorrect: -10 mastery and schedule soon.
- Mastered threshold: 100.
- Decay lightly after long inactivity.

### Quiz Score

For timed tests:

- Base points for correct answer.
- Speed bonus.
- Streak multiplier.
- Hint penalty.
- No penalty for learning mode.

### Review Scheduling

MVP spaced repetition buckets:

- New: never answered.
- Learning: missed or low mastery.
- Review: answered correctly but not mastered.
- Mastered: high confidence over several sessions.

Suggested intervals:

- Missed: same session and next session.
- Learning: 10 minutes, 1 day, 3 days.
- Review: 7 days, 14 days.
- Mastered: 30 days.

## UX Principles

- Start instantly: no login wall.
- Make every wrong answer useful with a clear correction, map, and memory hint.
- Keep quiz rounds short by default: 5 to 7 minutes.
- Let users choose region and scope.
- Provide visible progress by region.
- Avoid ads and interruptions during learning.
- Use correct flag ratios where possible.
- Support keyboard input for desktop.
- Support touch-first layouts for mobile.
- Make tiny countries tappable with insets or alternate prompts.
- Include color-blind support: do not rely only on color names; use labels and pattern descriptions.

## Visual Direction

The app should feel clear, geographic, and study-oriented.

- Main dashboard: compact, information-rich, and calm.
- Use flags as the primary visual assets.
- Use small map crops and region maps as supporting visuals.
- Avoid decorative hero pages; the first viewport should be the learning dashboard.
- Use cards for country/quiz items only, not nested decorative layouts.
- Keep controls familiar: tabs for Learn/Practice/Test, icon buttons for settings/sound/hints, segmented controls for modes.

## Accessibility

- All flags must have descriptive alt text.
- Quiz choices should be reachable by keyboard.
- Provide non-timed mode by default.
- Respect reduced-motion preferences.
- Maintain strong contrast.
- Do not use color alone to explain flag differences.
- Announce correct/incorrect feedback for screen readers.
- Allow larger text without layout overlap.

## Privacy And Accounts

MVP:

- No account.
- No tracking.
- All progress local to device.
- Export/import progress as JSON.

Future optional account:

- Sync progress across devices.
- Private-by-default profile.
- Leaderboards opt-in only.

## Metrics To Track Locally

- Countries mastered.
- Accuracy by region.
- Most missed countries.
- Slowest correct countries.
- Similar-flag confusion pairs.
- Daily challenge completion.
- Current and longest study streak.
- Time spent learning vs testing.

## Development Phases

### Phase 0: Product And Data Foundation

- Choose stack.
- Create app shell.
- Build country data generator.
- Validate flags and country list.
- Render first country detail card.
- Render a static world/region map crop for one country.

### Phase 1: MVP Learning App

- Home dashboard.
- Region browser.
- Country detail pages.
- Multiple-choice quiz.
- Reverse quiz.
- Answer reveal with map and fact.
- Local progress store.
- Mistake review.
- PWA install/offline support.

### Phase 2: Better Retention

- Spaced repetition scheduler.
- Daily flag.
- Similar-flags drill.
- Match mode.
- Progress dashboard.
- Region mastery map.

### Phase 3: Map And Advanced Testing

- Map locator mode.
- Ultimate mode.
- Tiny-country insets.
- Quiz customization.
- Import/export progress.

### Phase 4: Social And Expansion

- Optional accounts/sync.
- Friend challenges.
- Leaderboards.
- Multilingual UI.
- Teacher/classroom packs.
- More territories and historical flags.

## Suggested File/Code Structure

```text
src/
  app/
    routes/
    components/
    styles/
  features/
    atlas/
    quiz/
    progress/
    maps/
    pwa/
  data/
    generated/
    curated/
  lib/
    scoring/
    spaced-repetition/
    country-normalization/
scripts/
  build-country-data.ts
  validate-country-data.ts
public/
  flags/
  maps/
```

## MVP Acceptance Criteria

- User can install the app as a PWA.
- User can complete a quiz offline after first load.
- User can browse countries by continent.
- User can see a country flag, facts, and a map highlight.
- User can take untimed and timed quizzes.
- User can review mistakes.
- Progress persists after refresh.
- Country data and flag assets are validated by a script.
- The app is usable on mobile and desktop.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Flag/name disputes and entity scope confusion | Add clear dataset scope filters and source notes. Start with UN members, then expand. |
| Tiny countries are hard to tap on a map | Use inset maps, fallback multiple-choice locator prompts, and larger hit targets. |
| Flag facts may be inaccurate or oversimplified | Curate manually, cite sources where needed, and keep facts concise. |
| Offline assets become large | Use SVG flags, simplified GeoJSON, lazy-load high-detail assets. |
| Quiz distractors become unfair | Generate distractors by region/difficulty and test similar-flag groups manually. |
| Learners memorize answer positions | Shuffle options and balance distractor frequency. |

## Open Questions

- Should the first release cover only UN member states or include dependent territories from day one?
- Should the app be purely local/offline, or eventually include optional cloud sync?
- Should scoring prioritize educational mastery or game-like leaderboards?
- Which UI language should be the first non-English localization?
- How deep should flag-history content go in MVP?

## Recommended MVP Decision

Start with:

- UN member states plus Vatican City and Palestine as clearly labelled observer entities.
- No accounts.
- No ads.
- Offline-first PWA.
- Three modes: Learn, Practice, Test.
- Map highlight after every answer.
- Similar-flag drill in Phase 2, because it is a major differentiator and directly addresses the hardest flags.

