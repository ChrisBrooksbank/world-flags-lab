const DATA_URL = "./public/data/countries.json";
const STORE_KEY = "world-flags-lab-progress-v1";

const app = document.querySelector("#app");

const state = {
  countries: [],
  filtered: [],
  countryByIso: new Map(),
  view: "home",
  detailIso: "",
  region: "All",
  scope: "core",
  query: "",
  progress: loadProgress(),
  quiz: null,
  match: null
};

const viewLabels = [
  ["home", "Home"],
  ["learn", "Learn"],
  ["practice", "Practice"],
  ["test", "Test"],
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
  state.filtered = filteredCountries();
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
        <div class="prompt">${flagImg(question.country, "quiz-flag")}<h2>Tap ${question.country.nameCommon}'s location</h2></div>
        ${interactiveMap(question)}
        ${question.answered ? answerFeedback(question) : `<p class="muted">A close tap counts; tiny countries use a generous target.</p>`}
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
      <span class="continent c1"></span><span class="continent c2"></span><span class="continent c3"></span><span class="continent c4"></span><span class="continent c5"></span><span class="continent c6"></span>
      ${question.answered ? `<span class="target-dot" style="left:${pos.x}%;top:${pos.y}%"></span>` : ""}
      ${question.click ? `<span class="click-dot" style="${click}"></span>` : ""}
    </button>
  `;
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
