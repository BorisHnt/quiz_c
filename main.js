const STORAGE_KEY = "c_revision_progress_v2";

/*
  Schéma localStorage (clé: c_revision_progress_v2)
  {
    version: 2,
    flashcards: {
      records: {
        [id]: {
          id: string,
          category: string,
          question: string,
          answer: string,
          explanation: string,
          difficulty: "easy"|"medium"|"hard",
          successCount: number,
          failCount: number,
          lastSeen: number,
          nextDue: number,
          box: number
        }
      },
      history: [{ id: string, result: "known"|"unknown", at: number, category: string }],
      streak: number,
      bestStreak: number,
      session: {
        queueIds: string[],
        cursor: number,
        category: string,
        errorsOnly: boolean,
        sortMode: "weak"|"due",
        queueSize: number
      }
    },
    quiz: {
      sessions: [{ date: string, mode: string, score: number, total: number, penalty: number, timer: number }],
      errors: [{ date: string, question: string, selected: string, correct: string, tags: string[], mode: string }]
    },
    ui: {
      lastPage: string,
      lastSessionLink: string,
      lastVisitedAt: string,
      heatmap: {
        [YYYY-MM-DD]: { good: number, bad: number }
      }
    }
  }
*/

function isObj(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function defaultRecord(id = "", category = "", question = "", answer = "", explanation = "", difficulty = "medium") {
  return {
    id,
    category,
    question,
    answer,
    explanation,
    difficulty,
    successCount: 0,
    failCount: 0,
    lastSeen: 0,
    nextDue: 0,
    box: 1,
  };
}

function createDefaultProgress() {
  return {
    version: 2,
    flashcards: {
      records: {},
      history: [],
      streak: 0,
      bestStreak: 0,
      session: {
        queueIds: [],
        cursor: 0,
        category: "all",
        errorsOnly: false,
        sortMode: "weak",
        queueSize: 20,
      },
    },
    quiz: {
      sessions: [],
      errors: [],
    },
    ui: {
      lastPage: "index",
      lastSessionLink: "",
      lastVisitedAt: "",
      heatmap: {},
    },
  };
}

function normalizeProgress(input) {
  const base = createDefaultProgress();
  if (!isObj(input)) {
    return base;
  }

  const progress = {
    version: 2,
    flashcards: {
      records: {},
      history: Array.isArray(input.flashcards?.history)
        ? input.flashcards.history
            .filter((h) => isObj(h))
            .map((h) => ({
              id: typeof h.id === "string" ? h.id : "",
              result: h.result === "known" ? "known" : "unknown",
              at: safeNumber(h.at, 0),
              category: typeof h.category === "string" ? h.category : "",
            }))
            .slice(-200)
        : [],
      streak: safeNumber(input.flashcards?.streak, 0),
      bestStreak: safeNumber(input.flashcards?.bestStreak, 0),
      session: {
        queueIds: Array.isArray(input.flashcards?.session?.queueIds)
          ? input.flashcards.session.queueIds.filter((v) => typeof v === "string").slice(0, 200)
          : [],
        cursor: safeNumber(input.flashcards?.session?.cursor, 0),
        category: typeof input.flashcards?.session?.category === "string" ? input.flashcards.session.category : "all",
        errorsOnly: Boolean(input.flashcards?.session?.errorsOnly),
        sortMode: input.flashcards?.session?.sortMode === "due" ? "due" : "weak",
        queueSize: clamp(safeNumber(input.flashcards?.session?.queueSize, 20), 10, 30),
      },
    },
    quiz: {
      sessions: Array.isArray(input.quiz?.sessions)
        ? input.quiz.sessions
            .filter((s) => isObj(s))
            .map((s) => ({
              date: typeof s.date === "string" ? s.date : new Date().toISOString(),
              mode: typeof s.mode === "string" ? s.mode : "training",
              score: safeNumber(s.score, 0),
              total: safeNumber(s.total, 0),
              penalty: safeNumber(s.penalty, 0),
              timer: safeNumber(s.timer, 20),
            }))
            .slice(-150)
        : [],
      errors: Array.isArray(input.quiz?.errors)
        ? input.quiz.errors
            .filter((e) => isObj(e))
            .map((e) => ({
              date: typeof e.date === "string" ? e.date : new Date().toISOString(),
              question: typeof e.question === "string" ? e.question : "",
              selected: typeof e.selected === "string" ? e.selected : "",
              correct: typeof e.correct === "string" ? e.correct : "",
              tags: Array.isArray(e.tags) ? e.tags.filter((t) => typeof t === "string") : [],
              mode: typeof e.mode === "string" ? e.mode : "training",
            }))
            .slice(-300)
        : [],
    },
    ui: {
      lastPage: typeof input.ui?.lastPage === "string" ? input.ui.lastPage : "index",
      lastSessionLink: typeof input.ui?.lastSessionLink === "string" ? input.ui.lastSessionLink : "",
      lastVisitedAt: typeof input.ui?.lastVisitedAt === "string" ? input.ui.lastVisitedAt : "",
      heatmap: isObj(input.ui?.heatmap) ? input.ui.heatmap : {},
    },
  };

  if (isObj(input.flashcards?.records)) {
    Object.entries(input.flashcards.records).forEach(([id, raw]) => {
      if (!isObj(raw) || typeof id !== "string") {
        return;
      }

      const item = {
        ...defaultRecord(
          id,
          typeof raw.category === "string" ? raw.category : "",
          typeof raw.question === "string" ? raw.question : "",
          typeof raw.answer === "string" ? raw.answer : "",
          typeof raw.explanation === "string" ? raw.explanation : "",
          raw.difficulty === "hard" || raw.difficulty === "easy" ? raw.difficulty : "medium"
        ),
      };

      item.successCount = Math.max(0, safeNumber(raw.successCount, 0));
      item.failCount = Math.max(0, safeNumber(raw.failCount, 0));
      item.lastSeen = Math.max(0, safeNumber(raw.lastSeen, 0));
      item.nextDue = Math.max(0, safeNumber(raw.nextDue, 0));
      item.box = clamp(safeNumber(raw.box, 1), 1, 5);
      progress.flashcards.records[id] = item;
    });
  }

  Object.entries(progress.ui.heatmap).forEach(([day, entry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !isObj(entry)) {
      delete progress.ui.heatmap[day];
      return;
    }

    progress.ui.heatmap[day] = {
      good: Math.max(0, safeNumber(entry.good, 0)),
      bad: Math.max(0, safeNumber(entry.bad, 0)),
    };
  });

  return { ...base, ...progress };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultProgress();
    }
    return normalizeProgress(JSON.parse(raw));
  } catch (_error) {
    return createDefaultProgress();
  }
}

export function saveProgress(progress) {
  const normalized = normalizeProgress(progress);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function seedFromString(input) {
  let hash = 2166136261;
  const value = String(input);
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createSeededRng(seed) {
  let state = seed >>> 0;
  return function rng() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleArray(array, rng = Math.random) {
  const out = Array.isArray(array) ? [...array] : [];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function relativeTimeFromNow(timestamp) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "non planifié";
  }

  const deltaMs = timestamp - Date.now();
  const abs = Math.abs(deltaMs);
  const minutes = Math.round(abs / 60000);

  if (minutes < 1) {
    return deltaMs >= 0 ? "dans moins d'une minute" : "à l'instant";
  }

  if (minutes < 60) {
    return deltaMs >= 0 ? `dans ${minutes} min` : `il y a ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return deltaMs >= 0 ? `dans ${hours} h` : `il y a ${hours} h`;
  }

  const days = Math.round(hours / 24);
  return deltaMs >= 0 ? `dans ${days} j` : `il y a ${days} j`;
}

export function recordPerformance(progress, isSuccess) {
  const day = todayKey();
  const entry = progress.ui.heatmap[day] || { good: 0, bad: 0 };
  if (isSuccess) {
    entry.good += 1;
  } else {
    entry.bad += 1;
  }
  progress.ui.heatmap[day] = entry;
}

export function upsertFlashcardRecords(dataCards, progress) {
  const records = progress.flashcards.records;

  return dataCards.map((card) => {
    const prev = records[card.id];
    const merged = {
      ...defaultRecord(card.id, card.category, card.question, card.answer, card.explanation, card.difficulty),
      successCount: Math.max(0, safeNumber(card.successCount, 0)),
      failCount: Math.max(0, safeNumber(card.failCount, 0)),
      lastSeen: Math.max(0, safeNumber(card.lastSeen, 0)),
      nextDue: Math.max(0, safeNumber(card.nextDue, 0)),
      box: clamp(safeNumber(card.box, 1), 1, 5),
    };

    if (prev) {
      merged.successCount = Math.max(0, safeNumber(prev.successCount, merged.successCount));
      merged.failCount = Math.max(0, safeNumber(prev.failCount, merged.failCount));
      merged.lastSeen = Math.max(0, safeNumber(prev.lastSeen, merged.lastSeen));
      merged.nextDue = Math.max(0, safeNumber(prev.nextDue, merged.nextDue));
      merged.box = clamp(safeNumber(prev.box, merged.box), 1, 5);
    }

    records[card.id] = merged;
    return merged;
  });
}

function setupNavigation() {
  const navToggle = document.querySelector("#navToggle");
  const navMenu = document.querySelector("#navMenu");

  if (!navToggle || !navMenu) {
    return;
  }

  const closeMenu = () => {
    navMenu.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  };

  navToggle.addEventListener("click", () => {
    const open = navMenu.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}

export function initCommon(pageName, sessionLink = "") {
  setupNavigation();

  const progress = loadProgress();
  progress.ui.lastPage = pageName;
  progress.ui.lastVisitedAt = new Date().toISOString();
  if (sessionLink) {
    progress.ui.lastSessionLink = sessionLink;
  }

  return saveProgress(progress);
}

function masteryFromRecord(record) {
  const s = safeNumber(record.successCount, 0);
  const f = safeNumber(record.failCount, 0);
  const total = s + f;
  if (total <= 0) {
    return 0;
  }
  return Math.round((s / total) * 100);
}

function difficultyRank(value) {
  if (value === "hard") {
    return 3;
  }
  if (value === "medium") {
    return 2;
  }
  return 1;
}

function renderHeatmap(heatmapNode, heatmapData) {
  heatmapNode.innerHTML = "";
  const today = new Date();

  for (let i = 27; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const day = todayKey(date);
    const entry = isObj(heatmapData[day]) ? heatmapData[day] : { good: 0, bad: 0 };

    const total = entry.good + entry.bad;
    let level = 0;

    if (total > 0) {
      const ratio = entry.good / total;
      if (ratio >= 0.85) {
        level = 5;
      } else if (ratio >= 0.7) {
        level = 4;
      } else if (ratio >= 0.5) {
        level = 3;
      } else if (ratio >= 0.3) {
        level = 2;
      } else {
        level = 1;
      }
    }

    const cell = document.createElement("div");
    cell.className = `hm-cell hm-${level}`;
    cell.title = `${day}: ${entry.good} correct, ${entry.bad} erreur`;
    heatmapNode.appendChild(cell);
  }
}

async function loadFlashcardsDataForIndex() {
  try {
    const response = await fetch("./data/flashcards.json", { cache: "no-store" });
    if (!response.ok) {
      return [];
    }
    const payload = await response.json();
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload.filter(
      (item) =>
        isObj(item) &&
        typeof item.id === "string" &&
        typeof item.category === "string" &&
        typeof item.question === "string" &&
        typeof item.answer === "string" &&
        typeof item.explanation === "string"
    );
  } catch (_error) {
    return [];
  }
}

function updateStatsUI(progress) {
  const cardsReviewedNode = document.querySelector("#statCardsReviewed");
  const successRateNode = document.querySelector("#statSuccessRate");
  const streakNode = document.querySelector("#statStreak");
  const errorsNode = document.querySelector("#statErrors");

  if (!cardsReviewedNode || !successRateNode || !streakNode || !errorsNode) {
    return;
  }

  const records = Object.values(progress.flashcards.records);
  const totalKnown = records.reduce((sum, r) => sum + safeNumber(r.successCount, 0), 0);
  const totalUnknown = records.reduce((sum, r) => sum + safeNumber(r.failCount, 0), 0);
  const quizCorrect = progress.quiz.sessions.reduce((sum, s) => sum + safeNumber(s.score, 0), 0);
  const quizTotal = progress.quiz.sessions.reduce((sum, s) => sum + safeNumber(s.total, 0), 0);

  const reviewed = totalKnown + totalUnknown;
  const attempts = reviewed + quizTotal;
  const successRate = attempts > 0 ? Math.round(((totalKnown + quizCorrect) / attempts) * 100) : 0;

  cardsReviewedNode.textContent = String(reviewed);
  successRateNode.textContent = `${successRate}%`;
  streakNode.textContent = String(progress.flashcards.streak);
  errorsNode.textContent = String(progress.quiz.errors.length + totalUnknown);

  successRateNode.classList.toggle("is-good", successRate >= 60);
  successRateNode.classList.toggle("is-bad", successRate < 60);
  errorsNode.classList.toggle("is-bad", progress.quiz.errors.length + totalUnknown > 10);
}

function updateResumeButton(progress) {
  const resumeButton = document.querySelector("#resumeSessionBtn");
  if (!resumeButton) {
    return;
  }

  const session = progress.flashcards.session;
  const hasFlashResume = session.queueIds.length > 0 && session.cursor < session.queueIds.length;

  if (hasFlashResume) {
    resumeButton.classList.remove("hidden");
    resumeButton.textContent = "Reprendre la session flashcards";
    resumeButton.setAttribute("href", "flashcards.html?resume=1");
    return;
  }

  if (progress.ui.lastSessionLink && progress.ui.lastSessionLink !== "index.html") {
    resumeButton.classList.remove("hidden");
    resumeButton.textContent = "Reprendre la dernière session";
    resumeButton.setAttribute("href", progress.ui.lastSessionLink);
    return;
  }

  resumeButton.classList.add("hidden");
}

function renderDifficultCards(progress, sourceCards) {
  const node = document.querySelector("#difficultCardsList");
  if (!node) {
    return;
  }

  const sourceMap = new Map(sourceCards.map((card) => [card.id, card]));
  const ranked = Object.values(progress.flashcards.records)
    .map((record) => {
      const total = record.successCount + record.failCount;
      const failRate = total > 0 ? record.failCount / total : 0;
      const difficultyBoost = difficultyRank(record.difficulty) * 0.2;
      const score = failRate + difficultyBoost + (record.failCount > record.successCount ? 0.4 : 0);
      return { record, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  node.innerHTML = "";

  if (ranked.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Aucune carte prioritaire pour le moment.";
    node.appendChild(li);
    return;
  }

  ranked.forEach(({ record }) => {
    const fallback = sourceMap.get(record.id);
    const question = fallback?.question || record.question || "Question non disponible";
    const mastery = masteryFromRecord(record);
    const li = document.createElement("li");
    li.textContent = `[${record.category}] ${question} | maîtrise ${mastery}% | échecs ${record.failCount}`;
    node.appendChild(li);
  });
}

async function initIndexPage() {
  const progress = initCommon("index", "index.html");
  const heatmapNode = document.querySelector("#heatmapGrid");

  updateStatsUI(progress);
  updateResumeButton(progress);

  const dataCards = await loadFlashcardsDataForIndex();
  const refreshed = loadProgress();
  upsertFlashcardRecords(dataCards, refreshed);
  saveProgress(refreshed);

  renderDifficultCards(refreshed, dataCards);

  if (heatmapNode) {
    renderHeatmap(heatmapNode, refreshed.ui.heatmap);
  }
}

if (document.body.dataset.page === "index") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initIndexPage, { once: true });
  } else {
    initIndexPage();
  }
}
