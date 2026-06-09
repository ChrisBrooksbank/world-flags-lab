const DATA_URL = "./public/data/countries.json";
const COUNTRY_BOUNDS_URL = "./public/maps/countries.geojson";
const STORE_KEY = "world-flags-lab-progress-v1";

const app = document.querySelector("#app");
let globeRuntime = null;
let globeBootId = 0;

const state = {
  countries: [],
  filtered: [],
  countryByIso: new Map(),
  view: "home",
  detailIso: "",
  region: "All",
  scope: "core",
  query: "",
  globeIso: "",
  globeMode: "flags",
  globeSpin: false,
  progress: loadProgress(),
  quiz: null,
  match: null
};

const viewLabels = [
  ["home", "Home"],
  ["learn", "Learn"],
  ["practice", "Practice"],
  ["test", "Test"],
  ["globe", "Globe"],
  ["atlas", "Atlas"],
  ["progress", "Progress"],
  ["settings", "Settings"]
];

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || freshProgress();
  } catch {
    return freshProgress();
  }
}

function freshProgress() {
  return {
    answers: {},
    rounds: [],
    streak: 0,
    bestStreak: 0,
    lastStudyDate: "",
    settings: {
      timer: true,
      sound: false,
      reducedMotion: false,
      colorAssist: true,
      globeSpin: false,
      scope: "core"
    }
  };
}

function saveProgress() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state.progress));
}

async function boot() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Data request failed: ${response.status}`);
    const payload = await response.json();
    state.countries = payload.countries;
    state.countryByIso = new Map(state.countries.map((country) => [country.iso3, country]));
    state.scope = state.progress.settings.scope || "core";
    state.globeSpin = Boolean(state.progress.settings.globeSpin);
    registerServiceWorker();
    render();
  } catch (error) {
    app.innerHTML = `
      <section class="boot error">
        <h1>World Flags Lab</h1>
        <p>Country data is missing. Run <code>npm run build:data</code>, then reload.</p>
        <small>${escapeHtml(error.message)}</small>
      </section>
    `;
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function eligibleCountries() {
  return state.countries.filter((country) => {
    if (state.scope === "core") return country.defaultScope;
    if (state.scope === "sovereign") return country.defaultScope || country.entityType === "Sovereign state";
    return true;
  });
}

function filteredCountries() {
  const query = state.query.trim().toLowerCase();
  return eligibleCountries().filter((country) => {
    const regionMatch = state.region === "All" || country.region === state.region;
    const queryMatch =
      !query ||
      country.nameCommon.toLowerCase().includes(query) ||
      country.capital.toLowerCase().includes(query) ||
      country.iso3.toLowerCase().includes(query);
    return regionMatch && queryMatch;
  });
}

function regions() {
  return ["All", ...new Set(eligibleCountries().map((country) => country.region).sort())];
}

function render() {
  disposeGlobe();
  state.filtered = filteredCountries();
  if (!state.globeIso && state.filtered[0]) state.globeIso = dailyCountry(eligibleCountries()).iso3;
  app.innerHTML = `
    <div class="shell ${state.progress.settings.reducedMotion ? "reduced-motion" : ""}">
      <header class="topbar">
        <button class="brand" data-view="home" aria-label="World Flags Lab home">
          <img src="./icons/icon.svg" alt="" />
          <span>World Flags Lab</span>
        </button>
        <nav class="tabs" aria-label="Primary navigation">
          ${viewLabels.map(([key, label]) => `<button class="${state.view === key ? "active" : ""}" data-view="${key}">${label}</button>`).join("")}
        </nav>
      </header>
      <main>${renderView()}</main>
    </div>
  `;
  wireDynamicPieces();
  if (state.view === "globe" && !state.detailIso && !state.quiz && !state.match) initGlobe();
}

function renderView() {
  if (state.detailIso) return renderCountryDetail(state.countryByIso.get(state.detailIso));
  if (state.quiz) return renderQuiz();
  if (state.match) return renderMatch();
  switch (state.view) {
    case "learn":
      return renderLearn();
    case "practice":
      return renderPractice();
    case "test":
      return renderTest();
    case "globe":
      return renderGlobe();
    case "atlas":
      return renderAtlas();
    case "progress":
      return renderProgress();
    case "settings":
      return renderSettings();
    default:
      return renderHome();
  }
}

function renderHome() {
  const pool = eligibleCountries();
  const stats = progressStats(pool);
  const daily = dailyCountry(pool);
  const weak = weakestCountries(pool).slice(0, 5);
  return `
    <section class="hero-panel">
      <div>
        <p class="eyebrow">Offline-first flag trainer</p>
        <h1>Learn flags with maps, facts, and recall practice.</h1>
        <p>Study country cards, practice with smart distractors, review misses, then test yourself with timed and map-based rounds.</p>
        <div class="actions">
          <button class="primary" data-start-quiz="multiple" data-kind="practice">Start Practice</button>
          <button data-view="learn">Browse Flags</button>
          <button data-view="test">Take Test</button>
        </div>
      </div>
      <div class="daily-card">
        <span class="pill">Daily Flag</span>
        ${flagImg(daily, "daily-flag")}
        <h2>${daily.nameCommon}</h2>
        <p>${daily.memoryHint}</p>
        <button data-detail="${daily.iso3}">Open Card</button>
      </div>
    </section>

    <section class="dashboard-grid">
      ${metric("Countries", pool.length)}
      ${metric("Mastered", stats.mastered)}
      ${metric("Accuracy", `${stats.accuracy}%`)}
      ${metric("Study streak", `${state.progress.streak} days`)}
    </section>

    <section class="split">
      <div>
        <div class="section-head">
          <h2>Region Progress</h2>
          <button data-view="progress">Details</button>
        </div>
        <div class="region-list">${renderRegionProgress(pool)}</div>
      </div>
      <div>
        <div class="section-head">
          <h2>Weak Flags</h2>
          <button data-start-quiz="mistakes" data-kind="practice">Review</button>
        </div>
        <div class="mini-list">
          ${weak.map((country) => miniCountry(country, masteryFor(country.iso3))).join("") || `<p class="muted">No weak flags yet. Take a quiz to build your review list.</p>`}
        </div>
      </div>
    </section>
  `;
}

function renderLearn() {
  return `
    <section class="section-head">
      <div>
        <p class="eyebrow">Learn</p>
        <h1>Browse by region, then open a country card.</h1>
      </div>
      ${renderFilters()}
    </section>
    <section class="country-grid">
      ${state.filtered.map(renderCountryCard).join("")}
    </section>
  `;
}

function renderPractice() {
  return `
    <section class="section-head">
      <div>
        <p class="eyebrow">Practice</p>
        <h1>Short sessions with instant feedback.</h1>
      </div>
      ${renderFilters()}
    </section>
    <section class="mode-grid">
      ${modeCard("multiple", "Flag to Country", "Choose the country from a flag with same-region distractors.", "practice")}
      ${modeCard("reverse", "Country to Flag", "See a country name, then pick the matching flag.", "practice")}
      ${modeCard("similar", "Similar Flags", "Train the lookalikes that cause the most confusion.", "practice")}
      ${modeCard("blur", "Blur Mode", "Identify flags before the details are obvious.", "practice")}
      ${modeCard("map", "Map Locator", "See a flag, then tap its location on a world map.", "practice")}
      <article class="mode-card">
        <h2>Match Mode</h2>
        <p>Pair country names with flags in a compact memory round.</p>
        <button class="primary" data-start-match="practice">Start Match</button>
      </article>
      ${modeCard("mistakes", "Mistake Review", "Focus only on flags you have missed or answered slowly.", "practice")}
    </section>
  `;
}

function renderTest() {
  return `
    <section class="section-head">
      <div>
        <p class="eyebrow">Test</p>
        <h1>Timed exams, map recall, and capstone mode.</h1>
      </div>
      ${renderFilters()}
    </section>
    <section class="mode-grid">
      ${modeCard("multiple", "Timed 20", "Twenty fast questions with score, streak, and review.", "test")}
      ${modeCard("reverse", "Reverse Exam", "Prove you can picture the flag from the country name.", "test")}
      ${modeCard("map", "Map Locator Exam", "Tap the country location from the flag prompt.", "test")}
      ${modeCard("ultimate", "Ultimate Mode", "Identify the flag, answer the capital, and locate it.", "test")}
      <article class="mode-card">
        <h2>Region Exam</h2>
        <p>Uses the selected region and active data scope.</p>
        <button class="primary" data-start-quiz="multiple" data-kind="test">Start Region Exam</button>
      </article>
    </section>
  `;
}

function renderGlobe() {
  const pool = state.filtered.length ? state.filtered : eligibleCountries();
  const selected = state.countryByIso.get(state.globeIso) || dailyCountry(pool);
  const sameRegion = pool
    .filter((country) => country.region === selected.region && country.iso3 !== selected.iso3)
    .slice(0, 8);
  return `
    <section class="globe-page">
      <div class="globe-toolbar">
        <div>
          <p class="eyebrow">Globe Explorer</p>
          <h1>Zoom the world, then tap a country flag.</h1>
        </div>
        <div class="globe-controls">
          <label>
            <span>Markers</span>
            <select data-globe-mode>
              <option value="flags" ${state.globeMode === "flags" ? "selected" : ""}>Flags</option>
              <option value="mastery" ${state.globeMode === "mastery" ? "selected" : ""}>Mastery</option>
              <option value="weak" ${state.globeMode === "weak" ? "selected" : ""}>Weak flags</option>
            </select>
          </label>
          <button class="icon-toggle ${state.globeSpin ? "active" : ""}" data-globe-spin aria-pressed="${state.globeSpin}">
            ${state.globeSpin ? "Pause Spin" : "Spin Off"}
          </button>
          ${renderFilters()}
        </div>
      </div>
      <div class="globe-layout">
        <div class="globe-stage">
          <div id="globe-canvas" class="globe-canvas" data-countries="${escapeAttr(JSON.stringify(pool.map(globeCountryPayload)))}" data-selected="${selected.iso3}" data-mode="${state.globeMode}" data-spin="${state.globeSpin}">
            <div class="globe-loading">Loading globe...</div>
          </div>
          <div class="globe-hint">Drag to rotate. Pinch or scroll to zoom. Hover or tap a country.</div>
          <div class="globe-inspector" id="globe-inspector" aria-live="polite" data-selected-iso="${selected.iso3}">
            ${flagImg(selected, "globe-inspector-flag")}
            <div>
              <span data-globe-inspector-status>Selected</span>
              <strong data-globe-inspector-name>${selected.nameCommon}</strong>
              <small data-globe-inspector-region>${selected.region}${selected.subregion ? ` / ${selected.subregion}` : ""}</small>
            </div>
          </div>
        </div>
        <aside class="globe-card">
          <span class="pill">${selected.region}${selected.subregion ? ` / ${selected.subregion}` : ""}</span>
          ${flagImg(selected, "globe-flag")}
          <h2>${selected.nameCommon}</h2>
          <p>${selected.memoryHint}</p>
          <div class="fact-grid compact-facts">
            <div>Capital: ${selected.capital || "Not listed"}</div>
            <div>Mastery: ${masteryFor(selected.iso3)}%</div>
            <div>Entity: ${selected.entityType}</div>
          </div>
          <div class="actions">
            <button class="primary" data-detail="${selected.iso3}">Open Card</button>
            <button data-start-quiz="map" data-kind="practice" data-seed="${selected.iso3}">Locate</button>
          </div>
          <h3>Nearby Study Set</h3>
          <div class="flag-strip">
            ${sameRegion.map((country) => `<button data-globe-select="${country.iso3}">${flagImg(country, "thumb")}<span>${country.nameCommon}</span></button>`).join("")}
          </div>
        </aside>
      </div>
    </section>
  `;
}

function renderAtlas() {
  return `
    <section class="section-head">
      <div>
        <p class="eyebrow">Atlas</p>
        <h1>Search flags, capitals, facts, and map locations.</h1>
      </div>
      ${renderFilters()}
    </section>
    <section class="atlas-list">
      ${state.filtered.map((country) => `
        <button class="atlas-row" data-detail="${country.iso3}">
          ${flagImg(country, "thumb")}
          <strong>${country.nameCommon}</strong>
          <span>${country.capital || "No capital listed"}</span>
          <span>${country.region}</span>
          <span>${country.entityType}</span>
        </button>
      `).join("")}
    </section>
  `;
}

function renderProgress() {
  const pool = eligibleCountries();
  const stats = progressStats(pool);
  const weak = weakestCountries(pool).slice(0, 12);
  return `
    <section class="section-head">
      <div>
        <p class="eyebrow">Progress</p>
        <h1>Your mastery map.</h1>
      </div>
      <div class="actions">
        <button data-export-progress>Export</button>
        <label class="file-button">Import<input type="file" accept="application/json" data-import-progress /></label>
      </div>
    </section>
    <section class="dashboard-grid">
      ${metric("Answered", stats.answered)}
      ${metric("Correct", stats.correct)}
      ${metric("Accuracy", `${stats.accuracy}%`)}
      ${metric("Best streak", `${state.progress.bestStreak} days`)}
    </section>
    <section class="split">
      <div>
        <h2>By Region</h2>
        <div class="region-list">${renderRegionProgress(pool)}</div>
      </div>
      <div>
        <h2>Review Queue</h2>
        <div class="mini-list">${weak.map((country) => miniCountry(country, masteryFor(country.iso3))).join("")}</div>
      </div>
    </section>
    <section>
      <h2>Recent Rounds</h2>
      <div class="round-list">
        ${state.progress.rounds.slice(-8).reverse().map((round) => `
          <div class="round-row">
            <strong>${round.mode}</strong>
            <span>${round.correct}/${round.total}</span>
            <span>${round.score} pts</span>
            <span>${new Date(round.date).toLocaleDateString()}</span>
          </div>
        `).join("") || `<p class="muted">No completed rounds yet.</p>`}
      </div>
    </section>
  `;
}

function renderSettings() {
  return `
    <section class="section-head">
      <div>
        <p class="eyebrow">Settings</p>
        <h1>Keep the trainer comfortable and private.</h1>
      </div>
    </section>
    <section class="settings-grid">
      <label>
        Data scope
        <select data-setting="scope">
          <option value="core" ${state.scope === "core" ? "selected" : ""}>UN members + observers</option>
          <option value="sovereign" ${state.scope === "sovereign" ? "selected" : ""}>Sovereign states</option>
          <option value="all" ${state.scope === "all" ? "selected" : ""}>All countries and territories</option>
        </select>
      </label>
      ${toggle("timer", "Timed tests")}
      ${toggle("sound", "Sound feedback")}
      ${toggle("reducedMotion", "Reduced motion")}
      ${toggle("colorAssist", "Color-blind support labels")}
      <button data-reset-progress>Reset Progress</button>
    </section>
    <section class="note">
      <h2>Privacy</h2>
      <p>No account is required. Progress stays in this browser unless you export it.</p>
    </section>
  `;
}

function renderCountryDetail(country) {
  if (!country) {
    state.detailIso = "";
    return renderHome();
  }
  const similar = country.similarFlagIso3.map((iso) => state.countryByIso.get(iso)).filter(Boolean);
  return `
    <section class="detail-layout">
      <div class="detail-main">
        <button class="back" data-back>Back</button>
        <div class="flag-stage">${flagImg(country, "detail-flag")}</div>
        <div class="section-head compact">
          <div>
            <p class="eyebrow">${country.region}${country.subregion ? ` / ${country.subregion}` : ""}</p>
            <h1>${country.nameCommon}</h1>
            <p>${country.nameOfficial}</p>
          </div>
          <span class="score-pill">${masteryFor(country.iso3)} mastery</span>
        </div>
        <p class="memory">${country.memoryHint}</p>
        <div class="fact-grid">
          ${country.flagFacts.map((fact) => `<div>${fact}</div>`).join("")}
          <div>Entity: ${country.entityType}</div>
          <div>ISO: ${country.iso2} / ${country.iso3}</div>
        </div>
        <h2>Flag Notes</h2>
        <ul class="plain-list">${country.symbolism.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        ${
          similar.length
            ? `<h2>Similar Flags</h2><div class="similar-strip">${similar.map((item) => `
                <button data-detail="${item.iso3}">${flagImg(item, "thumb")}<span>${item.nameCommon}</span></button>
              `).join("")}</div>`
            : ""
        }
      </div>
      <aside class="detail-side">
        <h2>Map</h2>
        ${miniMap(country)}
        <button class="primary" data-start-quiz="map" data-kind="practice" data-seed="${country.iso3}">Locate This</button>
        <button data-start-quiz="similar" data-kind="practice" data-seed="${country.iso3}">Drill Lookalikes</button>
      </aside>
    </section>
  `;
}

function renderQuiz() {
  const quiz = state.quiz;
  if (quiz.finished) return renderQuizResults();
  const question = quiz.questions[quiz.index];
  const country = question.country;
  const answered = question.answered;
  const time = quiz.kind === "test" && state.progress.settings.timer ? `<span class="timer">${quiz.timeLeft}s</span>` : "";

  if (quiz.mode === "map") return renderMapQuestion(question, time);
  if (quiz.mode === "ultimate") return renderUltimateQuestion(question, time);

  const prompt = quiz.mode === "reverse" ? `<h2>${country.nameCommon}</h2>` : `${flagImg(country, quiz.mode === "blur" && !answered ? "quiz-flag blurred" : "quiz-flag")}`;
  const choices = question.choices
    .map((choice) => {
      const isCorrect = answered && choice.iso3 === country.iso3;
      const isWrong = answered && choice.iso3 === question.selectedIso && choice.iso3 !== country.iso3;
      return `
        <button class="choice ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}" data-answer="${choice.iso3}" ${answered ? "disabled" : ""}>
          ${quiz.mode === "reverse" ? flagImg(choice, "choice-flag") : ""}
          <span>${choice.nameCommon}</span>
        </button>
      `;
    })
    .join("");

  return `
    <section class="quiz-shell">
      ${quizHeader(time)}
      <div class="question-card">
        <div class="prompt">${prompt}</div>
        <div class="choices">${choices}</div>
        ${answered ? answerFeedback(question) : `<button class="ghost" data-hint>Hint</button>`}
      </div>
    </section>
  `;
}

function renderMapQuestion(question, time) {
  return `
    <section class="quiz-shell">
      ${quizHeader(time)}
      <div class="question-card">
        <div class="prompt">${flagImg(question.country, "quiz-flag")}<h2>Tap ${question.country.nameCommon} on the mini world map</h2></div>
        ${interactiveMap(question)}
        ${question.answered ? answerFeedback(question) : `<p class="muted">Use the continent and ocean labels as guides. A close tap counts; tiny countries use a generous target.</p>`}
      </div>
    </section>
  `;
}

function renderUltimateQuestion(question, time) {
  const stage = question.stage || "identify";
  const capitalChoices = question.capitalChoices || [];
  return `
    <section class="quiz-shell">
      ${quizHeader(time)}
      <div class="question-card">
        <div class="prompt">${flagImg(question.country, "quiz-flag")}</div>
        ${
          stage === "identify"
            ? `<h2>Identify the country</h2><div class="choices">${question.choices.map((choice) => `<button class="choice" data-answer="${choice.iso3}">${choice.nameCommon}</button>`).join("")}</div>`
            : stage === "capital"
              ? `<h2>Choose the capital of ${question.country.nameCommon}</h2><div class="choices">${capitalChoices.map((choice) => `<button class="choice" data-capital="${escapeAttr(choice)}">${choice}</button>`).join("")}</div>`
              : `<h2>Now locate it</h2>${interactiveMap(question)}`
        }
        ${question.answered ? answerFeedback(question) : ""}
      </div>
    </section>
  `;
}

function renderQuizResults() {
  const quiz = state.quiz;
  const total = quiz.questions.length;
  const correct = quiz.questions.filter((question) => question.correct).length;
  const misses = quiz.questions.filter((question) => !question.correct);
  return `
    <section class="results">
      <p class="eyebrow">Round complete</p>
      <h1>${correct}/${total} correct</h1>
      <div class="dashboard-grid">
        ${metric("Score", quiz.score)}
        ${metric("Accuracy", `${Math.round((correct / total) * 100)}%`)}
        ${metric("Best streak", quiz.bestRun)}
        ${metric("Mode", quiz.mode)}
      </div>
      <div class="actions">
        <button class="primary" data-repeat-quiz>Repeat Mode</button>
        <button data-close-quiz>Done</button>
      </div>
      <h2>Review</h2>
      <div class="country-grid">
        ${(misses.length ? misses : quiz.questions.slice(0, 8)).map((question) => renderCountryCard(question.country)).join("")}
      </div>
    </section>
  `;
}

function renderMatch() {
  const match = state.match;
  if (match.finished) {
    return `
      <section class="results">
        <p class="eyebrow">Match complete</p>
        <h1>${match.correctPairs}/${match.pairs.length} pairs</h1>
        <div class="dashboard-grid">
          ${metric("Moves", match.moves)}
          ${metric("Accuracy", `${Math.round((match.correctPairs / Math.max(1, match.moves)) * 100)}%`)}
          ${metric("Mode", "match")}
          ${metric("Pairs", match.pairs.length)}
        </div>
        <div class="actions"><button class="primary" data-start-match="${match.kind}">Play Again</button><button data-close-match>Done</button></div>
      </section>
    `;
  }
  const cards = [...match.flagCards, ...match.nameCards].sort((a, b) => a.sort - b.sort);
  return `
    <section class="quiz-shell">
      <div class="quiz-head">
        <button data-close-match>Exit</button>
        <strong>Match Mode</strong>
        <span>${match.correctPairs}/${match.pairs.length}</span>
      </div>
      <div class="match-grid">
        ${cards.map((card) => `
          <button class="match-card ${match.matched.includes(card.iso3) ? "matched" : ""} ${match.selected?.id === card.id ? "selected" : ""}" data-match="${card.id}">
            ${card.type === "flag" ? flagImg(state.countryByIso.get(card.iso3), "match-flag") : `<span>${state.countryByIso.get(card.iso3).nameCommon}</span>`}
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderFilters() {
  return `
    <div class="filters">
      <label>
        <span>Region</span>
        <select data-region>
          ${regions().map((region) => `<option ${state.region === region ? "selected" : ""}>${region}</option>`).join("")}
        </select>
      </label>
      <label>
        <span>Search</span>
        <input data-search value="${escapeAttr(state.query)}" placeholder="Country, capital, ISO" />
      </label>
    </div>
  `;
}

function renderCountryCard(country) {
  return `
    <article class="country-card">
      <button data-detail="${country.iso3}" class="card-open">
        ${flagImg(country, "card-flag")}
        <span class="country-name">${country.nameCommon}</span>
        <span>${country.capital || country.region}</span>
      </button>
      <div class="mastery-bar"><span style="width:${masteryFor(country.iso3)}%"></span></div>
    </article>
  `;
}

function renderRegionProgress(pool) {
  return regions()
    .filter((region) => region !== "All")
    .map((region) => {
      const countries = pool.filter((country) => country.region === region);
      const avg = countries.length ? Math.round(countries.reduce((sum, country) => sum + masteryFor(country.iso3), 0) / countries.length) : 0;
      return `
        <button class="region-row" data-set-region="${region}" data-view="learn">
          <span>${region}</span>
          <strong>${avg}%</strong>
          <div class="mastery-bar"><span style="width:${avg}%"></span></div>
        </button>
      `;
    })
    .join("");
}

function modeCard(mode, title, text, kind) {
  return `
    <article class="mode-card">
      <h2>${title}</h2>
      <p>${text}</p>
      <button class="primary" data-start-quiz="${mode}" data-kind="${kind}">Start</button>
    </article>
  `;
}

function metric(label, value) {
  return `<article class="metric"><span>${label}</span><strong>${value}</strong></article>`;
}

function miniCountry(country, mastery) {
  return `
    <button class="mini-country" data-detail="${country.iso3}">
      ${flagImg(country, "thumb")}
      <span>${country.nameCommon}</span>
      <strong>${mastery}%</strong>
    </button>
  `;
}

function flagImg(country, className) {
  return `<img class="${className}" src="${country.flagSvgPath}" alt="${escapeAttr(country.flagAlt || `Flag of ${country.nameCommon}`)}" loading="lazy" />`;
}

function miniMap(country) {
  const pos = mapPosition(country);
  return `
    <div class="mini-map" role="img" aria-label="Approximate location of ${escapeAttr(country.nameCommon)}">
      <span class="equator"></span>
      <span class="prime"></span>
      <span class="map-dot" style="left:${pos.x}%;top:${pos.y}%"></span>
      <span class="map-label" style="left:${Math.min(82, pos.x + 4)}%;top:${Math.max(8, pos.y - 7)}%">${country.nameCommon}</span>
    </div>
  `;
}

function interactiveMap(question) {
  const pos = mapPosition(question.country);
  const click = question.click ? `left:${question.click.x}%;top:${question.click.y}%` : "";
  return `
    <button class="world-map ${question.answered ? "answered" : ""}" data-map-answer aria-label="World map locator">
      <span class="equator"></span>
      <span class="prime"></span>
      <span class="map-ocean pacific-west">Pacific Ocean</span>
      <span class="map-ocean atlantic">Atlantic Ocean</span>
      <span class="map-ocean indian">Indian Ocean</span>
      <span class="map-region-label north-america">North America</span>
      <span class="map-region-label south-america">South America</span>
      <span class="map-region-label europe">Europe</span>
      <span class="map-region-label africa">Africa</span>
      <span class="map-region-label asia">Asia</span>
      <span class="map-region-label oceania">Oceania</span>
      <span class="continent c1"></span><span class="continent c2"></span><span class="continent c3"></span><span class="continent c4"></span><span class="continent c5"></span><span class="continent c6"></span><span class="continent c7"></span><span class="continent c8"></span>
      ${question.answered ? `<span class="target-dot" style="left:${pos.x}%;top:${pos.y}%"></span><span class="target-label" style="left:${Math.min(82, pos.x + 3)}%;top:${Math.max(7, pos.y - 7)}%">Correct: ${question.country.nameCommon}</span>` : ""}
      ${question.click ? `<span class="click-dot" style="${click}"></span><span class="click-label" style="left:${Math.min(82, question.click.x + 3)}%;top:${Math.min(88, question.click.y + 3)}%">Your tap</span>` : ""}
    </button>
  `;
}

function globeCountryPayload(country) {
  return {
    iso3: country.iso3,
    name: country.nameCommon,
    flagSvgPath: country.flagSvgPath,
    flagAlt: country.flagAlt,
    lat: Number(country.mapLat),
    lng: Number(country.mapLng),
    region: country.region,
    subregion: country.subregion,
    mastery: masteryFor(country.iso3),
    weak: progressFor(country.iso3).wrong
  };
}

async function initGlobe() {
  const bootId = ++globeBootId;
  const host = document.querySelector("#globe-canvas");
  if (!host) return;

  const countries = JSON.parse(host.dataset.countries || "[]");
  const selectedIso = host.dataset.selected;
  const mode = host.dataset.mode;
  const shouldSpin = host.dataset.spin === "true";
  const [THREE, boundsResponse] = await Promise.all([
    import("../vendor/three.module.js"),
    fetch(COUNTRY_BOUNDS_URL)
  ]);
  let countryBounds = null;
  try {
    countryBounds = boundsResponse.ok ? await boundsResponse.json() : null;
  } catch (error) {
    host.dataset.outlineError = error.message;
  }
  if (bootId !== globeBootId || !document.body.contains(host)) return;
  const selectedCountry = countries.find((country) => country.iso3 === selectedIso) || countries[0];
  const surfacePicker = countryBounds ? buildCountrySurfacePicker(countryBounds, countries) : null;

  host.innerHTML = "";
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const globe = new THREE.Group();
  if (selectedCountry) {
    globe.rotation.y = THREE.MathUtils.degToRad(-(selectedCountry.lng + 90));
    globe.rotation.x = THREE.MathUtils.degToRad(clamp(selectedCountry.lat * 0.45, -34, 34));
  }
  scene.add(globe);

  const radius = 2.35;
  const oceanTexture = makeOceanTexture(THREE);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 96, 64),
    new THREE.MeshStandardMaterial({
      color: 0x5ab4c6,
      map: oceanTexture,
      roughness: 0.48,
      metalness: 0.08
    })
  );
  globe.add(sphere);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.018, 96, 64),
    new THREE.MeshBasicMaterial({ color: 0x9ed8e8, transparent: true, opacity: 0.12 })
  );
  globe.add(atmosphere);

  addGlobeGuides(THREE, globe, radius);
  addOceanLabels(THREE, globe, radius);
  if (countryBounds) {
    try {
      addCountryOutlines(THREE, globe, radius, countryBounds);
      if (mode === "flags") {
        addCountryFlagFills(THREE, globe, radius, countryBounds, countries, selectedIso);
      } else {
        addSelectedFlagFill(THREE, globe, radius, countryBounds, countries, selectedIso);
      }
    } catch (error) {
      host.dataset.outlineError = error.message;
    }
  }
  host.dataset.outlineObjects = String(globe.getObjectByName("country-outlines")?.children.length || 0);
  host.dataset.flagFillObjects = String(
    globe.getObjectByName("country-flag-fills")?.children.length || globe.getObjectByName("selected-flag-fill")?.children.length || 0
  );
  host.dataset.flagHaloObjects = String(globe.getObjectByName("selected-flag-halo")?.children.length || 0);
  host.dataset.oceanLabelObjects = String(globe.getObjectByName("ocean-labels")?.children.length || 0);

  const markerGroup = new THREE.Group();
  const hitGroup = new THREE.Group();
  const markerGeometry = new THREE.SphereGeometry(0.036, 12, 12);
  const hitGeometry = new THREE.SphereGeometry(0.135, 16, 16);
  const hitMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  for (const country of countries) {
    const position = latLngToVector(country.lat, country.lng, radius + 0.055, THREE);
    const marker = new THREE.Mesh(markerGeometry, new THREE.MeshBasicMaterial({ color: markerColor(country, mode, selectedIso) }));
    marker.position.copy(position);
    marker.userData.iso3 = country.iso3;
    marker.scale.setScalar(country.iso3 === selectedIso ? 2.05 : markerScale(country, mode));
    markerGroup.add(marker);

    const hitTarget = new THREE.Mesh(hitGeometry, hitMaterial);
    hitTarget.position.copy(latLngToVector(country.lat, country.lng, radius + 0.14, THREE));
    hitTarget.userData.iso3 = country.iso3;
    hitTarget.userData.name = country.name;
    hitGroup.add(hitTarget);
  }
  globe.add(markerGroup);
  globe.add(hitGroup);

  scene.add(new THREE.AmbientLight(0xffffff, 1.8));
  const key = new THREE.DirectionalLight(0xffffff, 2.7);
  key.position.set(4, 3, 6);
  scene.add(key);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const markerWorldPosition = new THREE.Vector3();
  const markerScreenPosition = new THREE.Vector3();
  const sphereLocalPoint = new THREE.Vector3();
  const drag = { active: false, x: 0, y: 0, moved: 0 };
  const pointers = new Map();
  const zoom = { distance: 7.2, min: 4.45, max: 9.4, pinchStartDistance: 0, cameraStartDistance: 7.2 };
  const countryByIso = new Map(countries.map((country) => [country.iso3, country]));
  const inspector = document.querySelector("#globe-inspector");
  let inspectorIso = selectedIso;

  function resize() {
    const rect = host.getBoundingClientRect();
    const width = Math.max(320, rect.width);
    const height = Math.max(380, rect.height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function pointerToNdc(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  }

  function updateInspector(iso3, status = "Selected") {
    if (!inspector || !iso3 || (inspectorIso === `${status}:${iso3}`)) return;
    const country = countryByIso.get(iso3);
    if (!country) return;
    inspectorIso = `${status}:${iso3}`;
    const img = inspector.querySelector(".globe-inspector-flag");
    const statusNode = inspector.querySelector("[data-globe-inspector-status]");
    const nameNode = inspector.querySelector("[data-globe-inspector-name]");
    const regionNode = inspector.querySelector("[data-globe-inspector-region]");
    if (img) {
      img.src = country.flagSvgPath;
      img.alt = country.flagAlt || `Flag of ${country.name}`;
    }
    if (statusNode) statusNode.textContent = status;
    if (nameNode) nameNode.textContent = country.name;
    if (regionNode) regionNode.textContent = [country.region, country.subregion].filter(Boolean).join(" / ");
  }

  function countryIsoAtPointer(event, includeNearestMarker) {
    pointerToNdc(event);
    raycaster.setFromCamera(pointer, camera);
    const hit = firstVisibleMarkerHit(raycaster.intersectObjects(hitGroup.children, false), markerWorldPosition);
    const sphereHit = hit ? null : raycaster.intersectObject(sphere, false)[0];
    const surfaceIso = sphereHit && surfacePicker ? countryIsoFromSphereHit(sphereHit, globe, surfacePicker, sphereLocalPoint) : "";
    return (
      hit?.object?.userData?.iso3 ||
      surfaceIso ||
      (includeNearestMarker ? nearestMarkerIso(event, hitGroup, camera, renderer, markerWorldPosition, markerScreenPosition) : "")
    );
  }

  function setCameraDistance(distance) {
    zoom.distance = clamp(distance, zoom.min, zoom.max);
    camera.position.z = zoom.distance;
    host.dataset.zoom = zoom.distance.toFixed(2);
  }

  setCameraDistance(zoom.distance);

  function pointerDistance() {
    const values = [...pointers.values()];
    if (values.length < 2) return 0;
    return Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  }

  function onPointerDown(event) {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      drag.active = true;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.moved = 0;
    } else if (pointers.size === 2) {
      drag.active = false;
      drag.moved = 0;
      zoom.pinchStartDistance = pointerDistance();
      zoom.cameraStartDistance = zoom.distance;
    }
    renderer.domElement.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      const distance = pointerDistance();
      if (distance > 0 && zoom.pinchStartDistance > 0) {
        setCameraDistance(zoom.cameraStartDistance * (zoom.pinchStartDistance / distance));
      }
      return;
    }
    if (!drag.active) {
      const hoverIso = event.pointerType === "mouse" ? countryIsoAtPointer(event, false) : "";
      updateInspector(hoverIso || selectedIso, hoverIso ? "Hovering" : "Selected");
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    globe.rotation.y += dx * 0.007;
    globe.rotation.x = clamp(globe.rotation.x + dy * 0.006, -1.15, 1.15);
  }

  function onPointerUp(event) {
    const wasDragActive = drag.active;
    drag.active = false;
    pointers.delete(event.pointerId);
    renderer.domElement.releasePointerCapture?.(event.pointerId);
    if (pointers.size === 1) {
      const remaining = [...pointers.values()][0];
      drag.active = true;
      drag.x = remaining.x;
      drag.y = remaining.y;
      drag.moved = 9;
      return;
    }
    if (!wasDragActive) {
      updateInspector(selectedIso, "Selected");
      return;
    }
    if (drag.moved > 8) {
      updateInspector(selectedIso, "Selected");
      return;
    }
    const fallbackIso = countryIsoAtPointer(event, true);
    if (fallbackIso) {
      selectGlobeCountry(fallbackIso);
    }
  }

  function onPointerLeave() {
    drag.active = false;
    pointers.clear();
    updateInspector(selectedIso, "Selected");
  }

  function onPointerCancel(event) {
    pointers.delete(event.pointerId);
    drag.active = false;
    updateInspector(selectedIso, "Selected");
  }

  function onWheel(event) {
    event.preventDefault();
    const zoomFactor = Math.exp(event.deltaY * 0.0012);
    setCameraDistance(zoom.distance * zoomFactor);
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointerleave", onPointerLeave);
  renderer.domElement.addEventListener("pointercancel", onPointerCancel);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", resize);

  let frame = 0;
  function animate() {
    if (bootId !== globeBootId) return;
    frame = requestAnimationFrame(animate);
    if (shouldSpin && !drag.active && !state.progress.settings.reducedMotion) globe.rotation.y += 0.0018;
    renderer.render(scene, camera);
  }

  resize();
  animate();

  globeRuntime = {
    stop() {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("pointercancel", onPointerCancel);
      renderer.domElement.removeEventListener("wheel", onWheel);
      markerGeometry.dispose();
      hitGeometry.dispose();
      hitMaterial.dispose();
      scene.traverse((object) => {
        object.geometry?.dispose?.();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            material.map?.dispose?.();
            material.dispose?.();
          });
        }
      });
      renderer.dispose();
    }
  };
}

function disposeGlobe() {
  globeBootId += 1;
  if (globeRuntime) {
    globeRuntime.stop();
    globeRuntime = null;
  }
}

function addGlobeGuides(THREE, globe, radius) {
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xd6f3ee, transparent: true, opacity: 0.32 });
  for (let lat = -60; lat <= 60; lat += 30) {
    const points = [];
    for (let lng = -180; lng <= 180; lng += 4) points.push(latLngToVector(lat, lng, radius + 0.09, THREE));
    globe.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
  }
  for (let lng = -150; lng <= 180; lng += 30) {
    const points = [];
    for (let lat = -84; lat <= 84; lat += 4) points.push(latLngToVector(lat, lng, radius + 0.09, THREE));
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial));
  }
}

function addOceanLabels(THREE, globe, radius) {
  const labels = [
    { name: "Pacific Ocean", lat: 10, lng: -150, scale: 0.62 },
    { name: "Pacific Ocean", lat: -8, lng: 165, scale: 0.58 },
    { name: "Atlantic Ocean", lat: 22, lng: -42, scale: 0.56 },
    { name: "Atlantic Ocean", lat: -28, lng: -18, scale: 0.5 },
    { name: "Indian Ocean", lat: -22, lng: 78, scale: 0.54 },
    { name: "Indian Ocean", lat: -35, lng: 105, scale: 0.46 },
    { name: "Southern Ocean", lat: -56, lng: 40, scale: 0.5 },
    { name: "Arctic Ocean", lat: 72, lng: -20, scale: 0.48 }
  ];
  const labelGroup = new THREE.Group();
  labelGroup.name = "ocean-labels";

  for (const label of labels) {
    const texture = makeTextTexture(THREE, label.name);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.82,
      depthTest: true,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(latLngToVector(label.lat, label.lng, radius + 0.31, THREE));
    sprite.scale.set(label.scale * 2.7, label.scale * 0.58, 1);
    sprite.renderOrder = 3;
    sprite.userData.label = label.name;
    labelGroup.add(sprite);
  }

  globe.add(labelGroup);
}

function makeOceanTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const random = seededRandom(42);
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#1a758b");
  gradient.addColorStop(0.42, "#2f9bb0");
  gradient.addColorStop(0.7, "#145f78");
  gradient.addColorStop(1, "#0d4058");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 1500; i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const alpha = 0.025 + random() * 0.045;
    context.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    context.fillRect(x, y, 1 + random() * 2, 1);
  }

  for (let i = 0; i < 34; i += 1) {
    const y = 24 + random() * (canvas.height - 48);
    const amplitude = 6 + random() * 18;
    const length = 90 + random() * 180;
    const start = random() * canvas.width;
    context.beginPath();
    context.lineWidth = 1 + random() * 1.8;
    context.strokeStyle = `rgba(202, 246, 255, ${0.08 + random() * 0.1})`;
    for (let step = 0; step <= length; step += 8) {
      const x = (start + step) % canvas.width;
      const waveY = y + Math.sin(step * 0.045 + i) * amplitude;
      if (step === 0) context.moveTo(x, waveY);
      else context.lineTo(x, waveY);
    }
    context.stroke();
  }

  const glow = context.createRadialGradient(canvas.width * 0.34, canvas.height * 0.28, 20, canvas.width * 0.34, canvas.height * 0.28, 270);
  glow.addColorStop(0, "rgba(200, 255, 250, 0.2)");
  glow.addColorStop(1, "rgba(200, 255, 250, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return texture;
}

function seededRandom(seed) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function makeTextTexture(THREE, text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.font = "800 42px system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 8;
  context.strokeStyle = "rgba(10, 31, 35, 0.72)";
  context.fillStyle = "rgba(246, 255, 252, 0.94)";
  context.strokeText(text, canvas.width / 2, canvas.height / 2);
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addCountryOutlines(THREE, globe, radius, geojson) {
  const outlineMaterial = new THREE.LineBasicMaterial({
    color: 0xf7faf7,
    transparent: true,
    opacity: 0.86,
    depthTest: true
  });
  const coastMaterial = new THREE.LineBasicMaterial({
    color: 0xb8f6df,
    transparent: true,
    opacity: 0.5,
    depthTest: true
  });
  const outlineGroup = new THREE.Group();
  outlineGroup.name = "country-outlines";

  for (const feature of geojson.features || []) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
    for (const polygon of polygons) {
      polygon.forEach((ring, index) => {
        if (!Array.isArray(ring) || ring.length < 2) return;
        const segments = splitRingAtDateline(ring);
        for (const segment of segments) {
          if (segment.length < 2) continue;
          const points = densifyRing(segment, 3).map(([lng, lat]) => latLngToVector(lat, lng, radius + 0.12, THREE));
          const geometryLine = new THREE.BufferGeometry().setFromPoints(points);
          outlineGroup.add(new THREE.Line(geometryLine, index === 0 ? outlineMaterial : coastMaterial));
        }
      });
    }
  }

  globe.add(outlineGroup);
}

function addSelectedFlagFill(THREE, globe, radius, geojson, countries, selectedIso) {
  const country = countries.find((item) => item.iso3 === selectedIso);
  if (!country) return;

  const feature = findGeoFeatureForCountry(geojson, countries, selectedIso);
  if (!feature?.geometry) return;

  const texture = new THREE.TextureLoader().load(country.flagSvgPath);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });

  const fillGroup = new THREE.Group();
  fillGroup.name = "selected-flag-fill";
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [];

  for (const polygon of polygons) {
    const geometry = buildFlagPolygonGeometry(THREE, polygon, radius + 0.19);
    if (!geometry) continue;
    fillGroup.add(new THREE.Mesh(geometry, material));
  }

  globe.add(fillGroup);
  addSelectedFlagHalo(THREE, globe, radius, feature.geometry);
}

function addCountryFlagFills(THREE, globe, radius, geojson, countries, selectedIso) {
  const featureByIso = buildCountryFeatureLookup(geojson, countries);
  const textureLoader = new THREE.TextureLoader();
  const fillGroup = new THREE.Group();
  fillGroup.name = "country-flag-fills";

  for (const country of countries) {
    const feature = featureByIso.get(country.iso3);
    if (!feature?.geometry || !country.flagSvgPath) continue;

    const texture = textureLoader.load(country.flagSvgPath);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: country.iso3 === selectedIso ? 1 : 0.86,
      side: THREE.DoubleSide,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
    const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [];

    for (const polygon of polygons) {
      const geometry = buildFlagPolygonGeometry(THREE, polygon, radius + (country.iso3 === selectedIso ? 0.205 : 0.18));
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData.iso3 = country.iso3;
      fillGroup.add(mesh);
    }
  }

  if (fillGroup.children.length) globe.add(fillGroup);
  const selectedFeature = featureByIso.get(selectedIso);
  if (selectedFeature?.geometry) addSelectedFlagHalo(THREE, globe, radius, selectedFeature.geometry);
}

function addSelectedFlagHalo(THREE, globe, radius, geometry) {
  const haloMaterial = new THREE.LineBasicMaterial({
    color: 0xffd34d,
    transparent: true,
    opacity: 0.95,
    depthTest: true
  });
  const haloGroup = new THREE.Group();
  haloGroup.name = "selected-flag-halo";
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];

  for (const polygon of polygons) {
    const outer = polygon[0];
    if (!Array.isArray(outer) || outer.length < 2) continue;
    for (const segment of splitRingAtDateline(outer)) {
      const points = densifyRing(segment, 2).map(([lng, lat]) => latLngToVector(lat, lng, radius + 0.215, THREE));
      haloGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), haloMaterial));
    }
  }

  globe.add(haloGroup);
}

function findGeoFeatureForCountry(geojson, countries, iso3) {
  return buildCountryFeatureLookup(geojson, countries).get(iso3);
}

function buildCountryFeatureLookup(geojson, countries) {
  const isoByName = buildCountryNameLookup(countries);
  const map = new Map();
  for (const feature of geojson.features || []) {
    const featureIso = isoByName.get(normalizeCountryName(feature.properties?.name || ""));
    if (featureIso && !map.has(featureIso)) map.set(featureIso, feature);
  }
  return map;
}

function buildFlagPolygonGeometry(THREE, polygon, radius) {
  const rings = polygon
    .filter((ring) => Array.isArray(ring) && ring.length >= 3)
    .map((ring) => simplifyRingForFill(ring));
  if (!rings.length || rings[0].length < 3) return null;

  const outer = rings[0];
  const holes = rings.slice(1).filter((ring) => ring.length >= 3);
  const bounds = coordinateBounds([outer, ...holes]);
  const contour = outer.map(([lng, lat]) => new THREE.Vector2(lng, lat));
  const holeVectors = holes.map((ring) => ring.map(([lng, lat]) => new THREE.Vector2(lng, lat)));
  const triangles = THREE.ShapeUtils.triangulateShape(contour, holeVectors);
  const vertices2d = [...contour, ...holeVectors.flat()];
  const positions = [];
  const uvs = [];

  for (const triangle of triangles) {
    for (const index of triangle) {
      const point = vertices2d[index];
      const projected = latLngToPlainVector(point.y, point.x, radius);
      positions.push(projected.x, projected.y, projected.z);
      uvs.push((point.x - bounds.minLng) / bounds.width, (point.y - bounds.minLat) / bounds.height);
    }
  }

  if (!positions.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  return geometry;
}

function simplifyRingForFill(ring) {
  const simplified = [];
  let previous = null;
  for (const point of ring) {
    const current = [Number(point[0]), Number(point[1])];
    if (!Number.isFinite(current[0]) || !Number.isFinite(current[1])) continue;
    if (previous && Math.abs(current[0] - previous[0]) > 180) break;
    if (!previous || Math.abs(current[0] - previous[0]) > 0.08 || Math.abs(current[1] - previous[1]) > 0.08) {
      simplified.push(current);
      previous = current;
    }
  }
  if (simplified.length > 2) {
    const first = simplified[0];
    const last = simplified[simplified.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) simplified.push([...first]);
  }
  return simplified;
}

function coordinateBounds(rings) {
  const coords = rings.flat();
  const lngs = coords.map((coord) => coord[0]);
  const lats = coords.map((coord) => coord[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  return {
    minLng,
    minLat,
    width: Math.max(0.001, maxLng - minLng),
    height: Math.max(0.001, maxLat - minLat)
  };
}

function splitRingAtDateline(ring) {
  const segments = [];
  let current = [];
  for (let index = 0; index < ring.length; index += 1) {
    const point = ring[index];
    const previous = ring[index - 1];
    if (previous && Math.abs(point[0] - previous[0]) > 180) {
      if (current.length > 1) segments.push(current);
      current = [point];
    } else {
      current.push(point);
    }
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

function densifyRing(ring, maxStepDegrees) {
  const points = [];
  for (let index = 0; index < ring.length - 1; index += 1) {
    const start = ring[index];
    const end = ring[index + 1];
    const steps = Math.max(
      1,
      Math.ceil(Math.max(Math.abs(end[0] - start[0]), Math.abs(end[1] - start[1])) / maxStepDegrees)
    );
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps;
      points.push([start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t]);
    }
  }
  points.push(ring[ring.length - 1]);
  return points;
}

function latLngToVector(lat, lng, radius, THREE) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function latLngToPlainVector(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta)
  };
}

function vectorToLatLng(vector) {
  const normalized = vector.clone().normalize();
  const lat = Math.asin(normalized.y) * (180 / Math.PI);
  const theta = Math.atan2(normalized.z, -normalized.x) * (180 / Math.PI);
  let lng = theta - 180;
  if (lng < -180) lng += 360;
  if (lng > 180) lng -= 360;
  return { lat, lng };
}

function markerColor(country, mode, selectedIso) {
  if (country.iso3 === selectedIso) return 0xf2b84b;
  if (mode === "mastery") {
    if (country.mastery >= 80) return 0x35c275;
    if (country.mastery >= 35) return 0xf2b84b;
    return 0xf24c3d;
  }
  if (mode === "weak") return country.weak > 0 || country.mastery < 25 ? 0xf24c3d : 0x9ed8e8;
  return 0xffffff;
}

function markerScale(country, mode) {
  if (mode === "weak" && (country.weak > 0 || country.mastery < 25)) return 1.55;
  if (mode === "mastery" && country.mastery >= 80) return 1.45;
  return 1;
}

function firstVisibleMarkerHit(intersections, worldPosition) {
  for (const hit of intersections) {
    hit.object.getWorldPosition(worldPosition);
    if (worldPosition.z > 0.18) return hit;
  }
  return null;
}

function selectGlobeCountry(iso3) {
  state.globeIso = iso3;
  render();
}

function countryIsoFromSphereHit(hit, globe, picker, scratch) {
  scratch.copy(hit.point);
  globe.worldToLocal(scratch);
  const { lat, lng } = vectorToLatLng(scratch);
  return picker(lat, lng);
}

function buildCountrySurfacePicker(geojson, countries) {
  const isoByName = buildCountryNameLookup(countries);
  const features = (geojson.features || [])
    .map((feature) => ({
      iso3: isoByName.get(normalizeCountryName(feature.properties?.name || "")) || "",
      geometry: feature.geometry
    }))
    .filter((feature) => feature.iso3 && feature.geometry);

  return (lat, lng) => {
    for (const feature of features) {
      if (pointInGeometry(lng, lat, feature.geometry)) return feature.iso3;
    }
    return "";
  };
}

function buildCountryNameLookup(countries) {
  const map = new Map();
  for (const country of countries) {
    map.set(normalizeCountryName(country.name), country.iso3);
  }

  const aliases = {
    "united states of america": "United States",
    "democratic republic of the congo": "DR Congo",
    "republic of congo": "Republic of the Congo",
    "central african republic": "Central African Republic",
    "republic of serbia": "Serbia",
    "czech republic": "Czechia",
    "swaziland": "Eswatini",
    "east timor": "Timor-Leste",
    "ivory coast": "Ivory Coast",
    "laos": "Laos",
    "russia": "Russia",
    "syria": "Syria",
    "moldova": "Moldova",
    "south korea": "South Korea",
    "north korea": "North Korea",
    "iran": "Iran",
    "venezuela": "Venezuela",
    "bolivia": "Bolivia",
    "tanzania": "Tanzania",
    "vietnam": "Vietnam",
    "brunei": "Brunei",
    "the bahamas": "Bahamas",
    "gambia": "Gambia",
    "falkland islands": "Falkland Islands",
    "french southern and antarctic lands": "French Southern and Antarctic Lands"
  };

  for (const [featureName, countryName] of Object.entries(aliases)) {
    const match = countries.find((country) => normalizeCountryName(country.name) === normalizeCountryName(countryName));
    if (match) map.set(normalizeCountryName(featureName), match.iso3);
  }

  return map;
}

function normalizeCountryName(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function pointInGeometry(lng, lat, geometry) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
  return polygons.some((polygon) => pointInPolygon(lng, lat, polygon));
}

function pointInPolygon(lng, lat, polygon) {
  if (!polygon.length || !pointInRing(lng, lat, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(lng, lat, hole));
}

function pointInRing(lng, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function nearestMarkerIso(event, hitGroup, camera, renderer, worldPosition, screenPosition) {
  const rect = renderer.domElement.getBoundingClientRect();
  let bestIso = "";
  let bestDistance = Number.POSITIVE_INFINITY;
  const maxDistance = Math.max(30, Math.min(rect.width, rect.height) * 0.065);

  for (const marker of hitGroup.children) {
    marker.getWorldPosition(worldPosition);
    if (worldPosition.z <= 0.18) continue;
    const cameraSpace = worldPosition.clone().applyMatrix4(camera.matrixWorldInverse);
    if (cameraSpace.z > -0.35) continue;

    screenPosition.copy(worldPosition).project(camera);
    if (screenPosition.z < -1 || screenPosition.z > 1) continue;

    const x = rect.left + ((screenPosition.x + 1) / 2) * rect.width;
    const y = rect.top + ((1 - screenPosition.y) / 2) * rect.height;
    const dx = event.clientX - x;
    const dy = event.clientY - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < bestDistance && distance <= maxDistance) {
      bestDistance = distance;
      bestIso = marker.userData.iso3;
    }
  }

  return bestIso;
}

function mapPosition(country) {
  const x = ((Number(country.mapLng) + 180) / 360) * 100;
  const y = ((90 - Number(country.mapLat)) / 180) * 100;
  return { x: clamp(x, 2, 98), y: clamp(y, 4, 96) };
}

function quizHeader(time) {
  const quiz = state.quiz;
  return `
    <div class="quiz-head">
      <button data-close-quiz>Exit</button>
      <strong>${quiz.mode} ${quiz.index + 1}/${quiz.questions.length}</strong>
      <span>${quiz.score} pts</span>
      ${time}
    </div>
    <div class="mastery-bar"><span style="width:${((quiz.index + 1) / quiz.questions.length) * 100}%"></span></div>
  `;
}

function answerFeedback(question) {
  const country = question.country;
  return `
    <div class="feedback ${question.correct ? "correct" : "wrong"}">
      <strong>${question.correct ? "Correct" : `Answer: ${country.nameCommon}`}</strong>
      <p>${country.memoryHint}</p>
      ${miniMap(country)}
      <div class="actions">
        <button class="primary" data-next-question>${state.quiz.index + 1 === state.quiz.questions.length ? "Finish" : "Next"}</button>
        <button data-detail="${country.iso3}">Open Card</button>
      </div>
    </div>
  `;
}

function toggle(key, label) {
  const checked = state.progress.settings[key] ? "checked" : "";
  return `<label class="toggle"><span>${label}</span><input type="checkbox" data-setting="${key}" ${checked} /></label>`;
}

function startQuiz(mode, kind = "practice", seedIso = "") {
  const pool = quizPool(mode, seedIso);
  const length = kind === "test" ? Math.min(20, pool.length) : Math.min(10, pool.length);
  const selected = shuffle(pool).slice(0, Math.max(1, length));
  const questions = selected.map((country) => buildQuestion(country, mode));
  state.detailIso = "";
  state.match = null;
  state.quiz = {
    mode,
    kind,
    questions,
    index: 0,
    score: 0,
    run: 0,
    bestRun: 0,
    timeLeft: kind === "test" && state.progress.settings.timer ? 30 : 0,
    timerId: null,
    finished: false
  };
  startTimer();
  render();
}

function quizPool(mode, seedIso) {
  if (seedIso && state.countryByIso.has(seedIso)) {
    const seed = state.countryByIso.get(seedIso);
    if (mode === "similar") {
      return [seed, ...seed.similarFlagIso3.map((iso) => state.countryByIso.get(iso)).filter(Boolean)];
    }
    return [seed, ...shuffle(eligibleCountries().filter((country) => country.iso3 !== seedIso)).slice(0, 9)];
  }
  if (mode === "mistakes") {
    const weak = weakestCountries(eligibleCountries()).filter((country) => progressFor(country.iso3).seen);
    return weak.length ? weak : eligibleCountries();
  }
  if (mode === "similar") {
    const similar = eligibleCountries().filter((country) => country.similarFlagIso3.length);
    return similar.length ? similar : eligibleCountries();
  }
  return state.filtered.length >= 4 ? state.filtered : eligibleCountries();
}

function buildQuestion(country, mode) {
  const choices = buildChoices(country, mode === "similar");
  const question = {
    country,
    choices,
    selectedIso: "",
    answered: false,
    correct: false,
    startedAt: Date.now(),
    hints: 0
  };
  if (mode === "ultimate") {
    question.stage = "identify";
    question.stageCorrect = { identify: false, capital: false, map: false };
    question.capitalChoices = buildCapitalChoices(country);
  }
  return question;
}

function buildChoices(country, preferSimilar = false) {
  const pool = eligibleCountries().filter((item) => item.iso3 !== country.iso3);
  const similar = country.similarFlagIso3.map((iso) => state.countryByIso.get(iso)).filter(Boolean);
  const sameRegion = pool.filter((item) => item.region === country.region);
  const picks = [];
  if (preferSimilar || similar.length) picks.push(...shuffle(similar).slice(0, 3));
  picks.push(...shuffle(sameRegion.filter((item) => !picks.includes(item))).slice(0, 3));
  picks.push(...shuffle(pool.filter((item) => !picks.includes(item))).slice(0, 3));
  return shuffle([country, ...picks.slice(0, 3)]);
}

function buildCapitalChoices(country) {
  const capitals = eligibleCountries()
    .map((item) => item.capital)
    .filter(Boolean)
    .filter((capital) => capital !== country.capital);
  return shuffle([country.capital || country.nameCommon, ...shuffle(capitals).slice(0, 3)]);
}

function answerQuestion(iso) {
  const quiz = state.quiz;
  const question = quiz.questions[quiz.index];
  if (question.answered) return;

  if (quiz.mode === "ultimate" && question.stage === "identify") {
    question.stageCorrect.identify = iso === question.country.iso3;
    question.selectedIso = iso;
    question.stage = "capital";
    render();
    return;
  }

  question.selectedIso = iso;
  finishQuestion(question, iso === question.country.iso3);
}

function answerCapital(capital) {
  const question = state.quiz.questions[state.quiz.index];
  question.stageCorrect.capital = capital === (question.country.capital || question.country.nameCommon);
  question.stage = "map";
  render();
}

function answerMap(event) {
  const quiz = state.quiz;
  const question = quiz.questions[quiz.index];
  if (question.answered) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  question.click = { x, y };
  const target = mapPosition(question.country);
  const dx = x - target.x;
  const dy = y - target.y;
  const tolerance = question.country.areaKm2 < 1000 ? 11 : question.country.areaKm2 < 50000 ? 8 : 6;
  const mapCorrect = Math.sqrt(dx * dx + dy * dy) <= tolerance;
  if (quiz.mode === "ultimate") {
    question.stageCorrect.map = mapCorrect;
    finishQuestion(question, Object.values(question.stageCorrect).every(Boolean));
  } else {
    finishQuestion(question, mapCorrect);
  }
}

function finishQuestion(question, correct) {
  const quiz = state.quiz;
  const elapsed = Math.max(1, Math.round((Date.now() - question.startedAt) / 1000));
  question.correct = correct;
  question.answered = true;
  question.elapsed = elapsed;
  updateCountryProgress(question.country.iso3, correct, elapsed, question.hints);
  if (correct) {
    quiz.run += 1;
    quiz.bestRun = Math.max(quiz.bestRun, quiz.run);
    quiz.score += Math.max(25, 120 - elapsed * 3 - question.hints * 20) + quiz.run * 5;
  } else {
    quiz.run = 0;
  }
  stopTimer();
  saveProgress();
  render();
}

function nextQuestion() {
  const quiz = state.quiz;
  if (quiz.index + 1 >= quiz.questions.length) {
    finishRound();
    return;
  }
  quiz.index += 1;
  quiz.timeLeft = quiz.kind === "test" && state.progress.settings.timer ? 30 : 0;
  startTimer();
  render();
}

function finishRound() {
  const quiz = state.quiz;
  stopTimer();
  quiz.finished = true;
  const correct = quiz.questions.filter((question) => question.correct).length;
  state.progress.rounds.push({
    mode: quiz.mode,
    kind: quiz.kind,
    total: quiz.questions.length,
    correct,
    score: quiz.score,
    date: new Date().toISOString()
  });
  state.progress.rounds = state.progress.rounds.slice(-30);
  markStudyDay();
  saveProgress();
  render();
}

function startTimer() {
  stopTimer();
  const quiz = state.quiz;
  if (!quiz || quiz.finished || quiz.kind !== "test" || !state.progress.settings.timer) return;
  quiz.timerId = window.setInterval(() => {
    quiz.timeLeft -= 1;
    const timer = document.querySelector(".timer");
    if (timer) timer.textContent = `${quiz.timeLeft}s`;
    if (quiz.timeLeft <= 0) {
      const question = quiz.questions[quiz.index];
      if (!question.answered) finishQuestion(question, false);
    }
  }, 1000);
}

function stopTimer() {
  if (state.quiz?.timerId) {
    clearInterval(state.quiz.timerId);
    state.quiz.timerId = null;
  }
}

function startMatch(kind = "practice") {
  const pool = shuffle(state.filtered.length >= 8 ? state.filtered : eligibleCountries()).slice(0, 8);
  state.detailIso = "";
  state.quiz = null;
  state.match = {
    kind,
    pairs: pool.map((country) => country.iso3),
    flagCards: pool.map((country, index) => ({ id: `flag-${country.iso3}`, iso3: country.iso3, type: "flag", sort: Math.random() + index })),
    nameCards: pool.map((country, index) => ({ id: `name-${country.iso3}`, iso3: country.iso3, type: "name", sort: Math.random() + index })),
    selected: null,
    matched: [],
    moves: 0,
    correctPairs: 0,
    finished: false
  };
  render();
}

function chooseMatch(id) {
  const match = state.match;
  const cards = [...match.flagCards, ...match.nameCards];
  const card = cards.find((item) => item.id === id);
  if (!card || match.matched.includes(card.iso3)) return;
  if (!match.selected) {
    match.selected = card;
    render();
    return;
  }
  if (match.selected.id === card.id) {
    match.selected = null;
    render();
    return;
  }
  match.moves += 1;
  if (match.selected.iso3 === card.iso3 && match.selected.type !== card.type) {
    match.matched.push(card.iso3);
    match.correctPairs += 1;
    updateCountryProgress(card.iso3, true, 10, 0);
  } else {
    updateCountryProgress(card.iso3, false, 10, 0);
  }
  match.selected = null;
  if (match.correctPairs === match.pairs.length) {
    match.finished = true;
    markStudyDay();
  }
  saveProgress();
  render();
}

function updateCountryProgress(iso3, correct, elapsed, hints) {
  const item = progressFor(iso3);
  item.seen += 1;
  item.last = Date.now();
  item.totalTime += elapsed;
  item.hints += hints;
  if (correct) {
    item.correct += 1;
    item.streak += 1;
    item.mastery = clamp(item.mastery + (elapsed <= 8 ? 12 : 7) - hints * 2, 0, 100);
  } else {
    item.wrong += 1;
    item.streak = 0;
    item.mastery = clamp(item.mastery - 10, 0, 100);
  }
}

function progressFor(iso3) {
  if (!state.progress.answers[iso3]) {
    state.progress.answers[iso3] = { seen: 0, correct: 0, wrong: 0, mastery: 0, streak: 0, totalTime: 0, hints: 0, last: 0 };
  }
  return state.progress.answers[iso3];
}

function masteryFor(iso3) {
  return Math.round(progressFor(iso3).mastery || 0);
}

function progressStats(pool) {
  const rows = pool.map((country) => progressFor(country.iso3));
  const answered = rows.reduce((sum, row) => sum + row.seen, 0);
  const correct = rows.reduce((sum, row) => sum + row.correct, 0);
  return {
    answered,
    correct,
    mastered: pool.filter((country) => masteryFor(country.iso3) >= 80).length,
    accuracy: answered ? Math.round((correct / answered) * 100) : 0
  };
}

function weakestCountries(pool) {
  return [...pool].sort((a, b) => {
    const pa = progressFor(a.iso3);
    const pb = progressFor(b.iso3);
    const scoreA = pa.mastery - pa.wrong * 8 - (pa.seen ? 0 : 20);
    const scoreB = pb.mastery - pb.wrong * 8 - (pb.seen ? 0 : 20);
    return scoreA - scoreB;
  });
}

function dailyCountry(pool) {
  const key = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const index = Number(key) % pool.length;
  return pool[index] || state.countries[0];
}

function markStudyDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (state.progress.lastStudyDate === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  state.progress.streak = state.progress.lastStudyDate === yesterday ? state.progress.streak + 1 : 1;
  state.progress.bestStreak = Math.max(state.progress.bestStreak, state.progress.streak);
  state.progress.lastStudyDate = today;
}

function exportProgress() {
  const blob = new Blob([JSON.stringify(state.progress, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "world-flags-lab-progress.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function importProgress(file) {
  if (!file) return;
  const text = await file.text();
  const imported = JSON.parse(text);
  if (!imported.answers || !imported.settings) throw new Error("Invalid progress file");
  state.progress = imported;
  state.scope = imported.settings.scope || "core";
  saveProgress();
  render();
}

function wireDynamicPieces() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.setRegion) state.region = button.dataset.setRegion;
      state.view = button.dataset.view;
      state.detailIso = "";
      state.quiz = null;
      state.match = null;
      render();
    });
  });

  document.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      state.detailIso = button.dataset.detail;
      state.quiz = null;
      state.match = null;
      render();
    });
  });

  document.querySelector("[data-back]")?.addEventListener("click", () => {
    state.detailIso = "";
    render();
  });

  document.querySelector("[data-region]")?.addEventListener("change", (event) => {
    state.region = event.target.value;
    render();
  });

  document.querySelector("[data-search]")?.addEventListener("input", (event) => {
    const nextQuery = event.target.value;
    state.query = nextQuery;
    render();
    const input = document.querySelector("[data-search]");
    if (input) {
      input.focus();
      input.setSelectionRange(nextQuery.length, nextQuery.length);
    }
  });

  document.querySelector("[data-globe-mode]")?.addEventListener("change", (event) => {
    state.globeMode = event.target.value;
    render();
  });

  document.querySelector("[data-globe-spin]")?.addEventListener("click", () => {
    state.globeSpin = !state.globeSpin;
    state.progress.settings.globeSpin = state.globeSpin;
    saveProgress();
    render();
  });

  document.querySelectorAll("[data-globe-select]").forEach((button) => {
    button.addEventListener("click", () => {
      state.globeIso = button.dataset.globeSelect;
      render();
    });
  });

  document.querySelectorAll("[data-start-quiz]").forEach((button) => {
    button.addEventListener("click", () => startQuiz(button.dataset.startQuiz, button.dataset.kind || "practice", button.dataset.seed || ""));
  });

  document.querySelectorAll("[data-start-match]").forEach((button) => {
    button.addEventListener("click", () => startMatch(button.dataset.startMatch || "practice"));
  });

  document.querySelectorAll("[data-answer]").forEach((button) => {
    button.addEventListener("click", () => answerQuestion(button.dataset.answer));
  });

  document.querySelectorAll("[data-capital]").forEach((button) => {
    button.addEventListener("click", () => answerCapital(button.dataset.capital));
  });

  document.querySelector("[data-map-answer]")?.addEventListener("click", answerMap);
  document.querySelector("[data-next-question]")?.addEventListener("click", nextQuestion);
  document.querySelector("[data-close-quiz]")?.addEventListener("click", () => {
    stopTimer();
    state.quiz = null;
    render();
  });
  document.querySelector("[data-repeat-quiz]")?.addEventListener("click", () => {
    const { mode, kind } = state.quiz;
    state.quiz = null;
    startQuiz(mode, kind);
  });
  document.querySelector("[data-close-match]")?.addEventListener("click", () => {
    state.match = null;
    render();
  });
  document.querySelectorAll("[data-match]").forEach((button) => {
    button.addEventListener("click", () => chooseMatch(button.dataset.match));
  });
  document.querySelector("[data-hint]")?.addEventListener("click", () => {
    const question = state.quiz.questions[state.quiz.index];
    question.hints += 1;
    alert(question.country.memoryHint);
  });
  document.querySelectorAll("[data-setting]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const key = event.target.dataset.setting;
      if (key === "scope") {
        state.scope = event.target.value;
        state.progress.settings.scope = state.scope;
      } else {
        state.progress.settings[key] = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      }
      saveProgress();
      render();
    });
  });
  document.querySelector("[data-reset-progress]")?.addEventListener("click", () => {
    if (confirm("Reset all local progress?")) {
      state.progress = freshProgress();
      state.scope = "core";
      saveProgress();
      render();
    }
  });
  document.querySelector("[data-export-progress]")?.addEventListener("click", exportProgress);
  document.querySelector("[data-import-progress]")?.addEventListener("change", (event) => {
    importProgress(event.target.files[0]).catch((error) => alert(error.message));
  });
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

boot();
