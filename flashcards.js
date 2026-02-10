import {
  initCommon,
  loadProgress,
  saveProgress,
  upsertFlashcardRecords,
  relativeTimeFromNow,
  recordPerformance,
} from "./main.js";

const QUICK_RETRY_MINUTES = 3;
const KNOWN_INTERVAL_MINUTES = {
  1: 10,
  2: 60,
  3: 360,
  4: 1440,
  5: 4320,
};

const Scheduler = {
  mastery(record) {
    const total = record.successCount + record.failCount;
    if (total <= 0) {
      return 0;
    }
    return record.successCount / total;
  },

  difficultyWeight(difficulty) {
    if (difficulty === "hard") {
      return 1.8;
    }
    if (difficulty === "medium") {
      return 1.4;
    }
    return 1;
  },

  priority(record, now, sortMode) {
    const dueWeight = now >= record.nextDue ? 2.5 : 0.8;
    const failPressure = 1 + record.failCount * 0.35;
    const masteryPenalty = 1 + (1 - Scheduler.mastery(record));
    const diffWeight = Scheduler.difficultyWeight(record.difficulty);

    if (sortMode === "due") {
      return dueWeight * failPressure;
    }

    return dueWeight * failPressure * masteryPenalty * diffWeight;
  },

  scheduleAfterAnswer(record, knew, now) {
    const out = { ...record };
    out.lastSeen = now;

    if (knew) {
      out.successCount += 1;
      out.box = Math.min(5, out.box + 1);
      const minutes = KNOWN_INTERVAL_MINUTES[out.box] || 10;
      out.nextDue = now + minutes * 60 * 1000;
    } else {
      out.failCount += 1;
      out.box = Math.max(1, out.box - 1);
      out.nextDue = now + QUICK_RETRY_MINUTES * 60 * 1000;
    }

    return out;
  },
};

const ui = {
  categoryFilter: null,
  queueSizeSelect: null,
  sortModeSelect: null,
  errorsOnlyToggle: null,
  applyFiltersBtn: null,
  restartSessionBtn: null,
  cardCategory: null,
  cardProgress: null,
  cardProgressBar: null,
  flashcardContainer: null,
  cardQuestion: null,
  answerBlock: null,
  cardAnswerTitle: null,
  cardAnswerSteps: null,
  cardExplanation: null,
  flipBtn: null,
  knownBtn: null,
  unknownBtn: null,
  masteryBadge: null,
  nextDueBadge: null,
  feedback: null,
  historyList: null,
};

const state = {
  cards: [],
  queueIds: [],
  cursor: 0,
  flipped: false,
  progress: null,
};

function selectUi() {
  ui.categoryFilter = document.querySelector("#categoryFilter");
  ui.queueSizeSelect = document.querySelector("#queueSizeSelect");
  ui.sortModeSelect = document.querySelector("#sortModeSelect");
  ui.errorsOnlyToggle = document.querySelector("#errorsOnlyToggle");
  ui.applyFiltersBtn = document.querySelector("#applyFiltersBtn");
  ui.restartSessionBtn = document.querySelector("#restartSessionBtn");
  ui.cardCategory = document.querySelector("#cardCategory");
  ui.cardProgress = document.querySelector("#cardProgress");
  ui.cardProgressBar = document.querySelector("#cardProgressBar");
  ui.flashcardContainer = document.querySelector("#flashcardContainer");
  ui.cardQuestion = document.querySelector("#cardQuestion");
  ui.answerBlock = document.querySelector("#answerBlock");
  ui.cardAnswerTitle = document.querySelector("#cardAnswerTitle");
  ui.cardAnswerSteps = document.querySelector("#cardAnswerSteps");
  ui.cardExplanation = document.querySelector("#cardExplanation");
  ui.flipBtn = document.querySelector("#flipBtn");
  ui.knownBtn = document.querySelector("#knownBtn");
  ui.unknownBtn = document.querySelector("#unknownBtn");
  ui.masteryBadge = document.querySelector("#masteryBadge");
  ui.nextDueBadge = document.querySelector("#nextDueBadge");
  ui.feedback = document.querySelector("#flashcardsFeedback");
  ui.historyList = document.querySelector("#historyList");

  return Object.values(ui).every((node) => node !== null);
}

function setFeedback(message, type = "") {
  ui.feedback.textContent = message;
  ui.feedback.classList.remove("is-success", "is-error");
  if (type) {
    ui.feedback.classList.add(type);
  }
}

function sanitizeFlashcards(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter((item) => item && typeof item === "object")
    .filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.category === "string" &&
        typeof item.question === "string" &&
        typeof item.answer === "string" &&
        typeof item.explanation === "string"
    )
    .map((item) => ({
      id: item.id,
      category: item.category,
      question: item.question,
      answer: item.answer,
      explanation: item.explanation,
      difficulty: item.difficulty === "hard" || item.difficulty === "easy" ? item.difficulty : "medium",
      successCount: Number.isFinite(item.successCount) ? item.successCount : 0,
      failCount: Number.isFinite(item.failCount) ? item.failCount : 0,
      lastSeen: Number.isFinite(item.lastSeen) ? item.lastSeen : 0,
      nextDue: Number.isFinite(item.nextDue) ? item.nextDue : 0,
      box: 1,
    }));
}

async function fetchFlashcards() {
  const response = await fetch("./data/flashcards.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Impossible de charger les flashcards.");
  }

  const payload = await response.json();
  return sanitizeFlashcards(payload);
}

function renderCategoryFilter(cards) {
  const categories = [...new Set(cards.map((card) => card.category))].sort((a, b) => a.localeCompare(b));
  const currentValue = ui.categoryFilter.value;

  ui.categoryFilter.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Toutes";
  ui.categoryFilter.appendChild(allOption);

  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    ui.categoryFilter.appendChild(option);
  });

  ui.categoryFilter.value = categories.includes(currentValue) ? currentValue : "all";
}

function getFilteredCards() {
  const category = ui.categoryFilter.value;
  const errorsOnly = ui.errorsOnlyToggle.checked;

  return state.cards.filter((card) => {
    if (category !== "all" && card.category !== category) {
      return false;
    }

    if (errorsOnly) {
      const rec = state.progress.flashcards.records[card.id];
      if (!rec) {
        return false;
      }
      return rec.failCount > 0;
    }

    return true;
  });
}

function buildQueue() {
  const now = Date.now();
  const filtered = getFilteredCards();
  const sortMode = ui.sortModeSelect.value;
  const queueSize = Number.parseInt(ui.queueSizeSelect.value, 10);

  const ranked = filtered
    .map((card) => ({
      id: card.id,
      record: state.progress.flashcards.records[card.id],
      priority: Scheduler.priority(state.progress.flashcards.records[card.id], now, sortMode),
    }))
    .sort((a, b) => {
      if (sortMode === "due") {
        const dueDiff = a.record.nextDue - b.record.nextDue;
        if (dueDiff !== 0) {
          return dueDiff;
        }
      }
      return b.priority - a.priority;
    });

  const chosen = ranked.slice(0, Math.max(1, queueSize)).map((entry) => entry.id);

  state.queueIds = chosen;
  state.cursor = 0;

  state.progress.flashcards.session = {
    queueIds: [...state.queueIds],
    cursor: state.cursor,
    category: ui.categoryFilter.value,
    errorsOnly: ui.errorsOnlyToggle.checked,
    sortMode: ui.sortModeSelect.value,
    queueSize,
  };

  state.progress = saveProgress(state.progress);
}

function currentRecord() {
  const id = state.queueIds[state.cursor];
  if (!id) {
    return null;
  }
  return state.progress.flashcards.records[id] || null;
}

function updateProgressUi() {
  const total = state.queueIds.length;
  const current = Math.min(state.cursor + 1, total);
  ui.cardProgress.textContent = `${current} / ${total}`;

  const width = total > 0 ? Math.round((Math.min(state.cursor, total) / total) * 100) : 0;
  ui.cardProgressBar.style.width = `${width}%`;
}

function renderHistory() {
  const recent = [...state.progress.flashcards.history].slice(-10).reverse();
  ui.historyList.innerHTML = "";

  if (recent.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Aucun historique enregistré.";
    ui.historyList.appendChild(li);
    return;
  }

  recent.forEach((item) => {
    const li = document.createElement("li");
    const date = new Date(item.at).toLocaleString("fr-FR");
    li.textContent = `${date} | ${item.category} | ${item.result === "known" ? "connu" : "inconnu"}`;
    ui.historyList.appendChild(li);
  });
}

function parseAnswer(answerText) {
  const text = String(answerText || "").trim();
  const out = { title: "Réponse attendue", steps: [], objective: "" };
  if (!text) {
    return out;
  }

  const objectiveMatch = text.match(/Objectif\\s*:\\s*(.+)$/i);
  if (objectiveMatch) {
    out.objective = objectiveMatch[1].trim();
  }

  const checklist = text
    .replace(/^Checklist(?: opérationnelle)?\\s*:\\s*/i, "")
    .replace(/Objectif\\s*:.+$/i, "")
    .trim();

  if (checklist.length > 0) {
    out.steps = checklist
      .split("|")
      .map((step) => step.replace(/^\\s*\\d+\\)\\s*/, "").trim())
      .filter(Boolean);
  }

  if (out.objective) {
    out.title = `Réponse attendue - ${out.objective}`;
  }

  return out;
}

function renderCard() {
  updateProgressUi();

  const record = currentRecord();
  if (!record) {
    ui.cardCategory.textContent = "Session terminée";
    ui.cardQuestion.textContent = "Session terminée. Lance une nouvelle session ou modifie les filtres.";
    ui.answerBlock.classList.add("hidden");
    ui.knownBtn.disabled = true;
    ui.unknownBtn.disabled = true;
    ui.flipBtn.disabled = true;
    ui.masteryBadge.textContent = "Maîtrise: -";
    ui.nextDueBadge.textContent = "Prochaine apparition: -";
    setFeedback("Aucune autre carte dans la session.");
    return;
  }

  const totalAttempts = record.successCount + record.failCount;
  const mastery = totalAttempts > 0 ? Math.round((record.successCount / totalAttempts) * 100) : 0;

  ui.cardCategory.textContent = `${record.category} | ${record.difficulty}`;
  ui.cardQuestion.textContent = record.question;
  const parsedAnswer = parseAnswer(record.answer);
  ui.cardAnswerTitle.textContent = parsedAnswer.title;
  ui.cardAnswerSteps.innerHTML = "";
  if (parsedAnswer.steps.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Aucune étape définie.";
    ui.cardAnswerSteps.appendChild(li);
  } else {
    parsedAnswer.steps.forEach((step) => {
      const li = document.createElement("li");
      li.textContent = step;
      ui.cardAnswerSteps.appendChild(li);
    });
  }
  ui.cardExplanation.textContent = record.explanation;
  ui.masteryBadge.textContent = `Maîtrise: ${mastery}%`;
  ui.nextDueBadge.textContent = `Prochaine apparition: ${relativeTimeFromNow(record.nextDue)}`;

  ui.knownBtn.disabled = !state.flipped;
  ui.unknownBtn.disabled = !state.flipped;
  ui.flipBtn.disabled = false;

  if (state.flipped) {
    ui.answerBlock.classList.remove("hidden");
  } else {
    ui.answerBlock.classList.add("hidden");
  }
}

function flipCard() {
  if (!currentRecord()) {
    return;
  }

  state.flipped = !state.flipped;
  ui.answerBlock.classList.toggle("hidden", !state.flipped);
  ui.knownBtn.disabled = !state.flipped;
  ui.unknownBtn.disabled = !state.flipped;
}

function requeueFailedCard(cardId) {
  const insertIndex = Math.min(state.cursor + 2, state.queueIds.length);
  state.queueIds.splice(insertIndex, 0, cardId);
}

function pushHistory(card, result) {
  state.progress.flashcards.history.push({
    id: card.id,
    result,
    at: Date.now(),
    category: card.category,
  });
  state.progress.flashcards.history = state.progress.flashcards.history.slice(-200);
}

function applyAnswer(knew) {
  const record = currentRecord();
  if (!record || !state.flipped) {
    return;
  }

  const now = Date.now();
  const updated = Scheduler.scheduleAfterAnswer(record, knew, now);

  state.progress.flashcards.records[record.id] = updated;
  if (knew) {
    state.progress.flashcards.streak += 1;
    state.progress.flashcards.bestStreak = Math.max(
      state.progress.flashcards.bestStreak,
      state.progress.flashcards.streak
    );
  } else {
    state.progress.flashcards.streak = 0;
    requeueFailedCard(record.id);
  }

  pushHistory(record, knew ? "known" : "unknown");
  recordPerformance(state.progress, knew);

  state.cursor += 1;
  state.progress.flashcards.session.queueIds = [...state.queueIds];
  state.progress.flashcards.session.cursor = state.cursor;

  state.progress = saveProgress(state.progress);
  state.flipped = false;

  setFeedback(
    knew
      ? `Validé. Nouvelle apparition ${relativeTimeFromNow(updated.nextDue)}.`
      : `Carte ratée. Retour rapide ${relativeTimeFromNow(updated.nextDue)}.`,
    knew ? "is-success" : "is-error"
  );

  renderHistory();
  renderCard();
}

function restoreSessionFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const wantsResume = params.get("resume") === "1";
  const errorsOnlyFromQuery = params.get("errors") === "1";

  if (errorsOnlyFromQuery) {
    ui.errorsOnlyToggle.checked = true;
  }

  if (!wantsResume) {
    return false;
  }

  const session = state.progress.flashcards.session;
  if (!Array.isArray(session.queueIds) || session.queueIds.length === 0) {
    return false;
  }

  ui.categoryFilter.value = session.category || "all";
  ui.errorsOnlyToggle.checked = Boolean(session.errorsOnly);
  ui.sortModeSelect.value = session.sortMode === "due" ? "due" : "weak";
  ui.queueSizeSelect.value = String(session.queueSize || 20);

  state.queueIds = [...session.queueIds].filter((id) => state.progress.flashcards.records[id]);
  state.cursor = Math.max(0, Math.min(session.cursor || 0, state.queueIds.length));
  return state.queueIds.length > 0;
}

function bindEvents() {
  ui.flipBtn.addEventListener("click", flipCard);
  ui.knownBtn.addEventListener("click", () => applyAnswer(true));
  ui.unknownBtn.addEventListener("click", () => applyAnswer(false));

  ui.flashcardContainer.addEventListener("click", flipCard);
  ui.flashcardContainer.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      flipCard();
    }
  });

  ui.applyFiltersBtn.addEventListener("click", () => {
    state.flipped = false;
    buildQueue();
    renderCard();
    setFeedback("Filtres appliqués. Nouvelle file de révision.");
  });

  ui.restartSessionBtn.addEventListener("click", () => {
    state.flipped = false;
    buildQueue();
    renderCard();
    setFeedback("Nouvelle session démarrée.");
  });

  document.addEventListener("keydown", (event) => {
    const tag = document.activeElement?.tagName || "";
    if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) {
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      flipCard();
      return;
    }

    if (event.key.toLowerCase() === "k" || event.code === "ArrowRight") {
      event.preventDefault();
      applyAnswer(true);
      return;
    }

    if (event.key.toLowerCase() === "i" || event.code === "ArrowLeft") {
      event.preventDefault();
      applyAnswer(false);
    }
  });
}

async function initFlashcardsPage() {
  if (!selectUi()) {
    return;
  }

  try {
    state.progress = initCommon("flashcards", "flashcards.html?resume=1");
    const dataCards = await fetchFlashcards();
    state.cards = upsertFlashcardRecords(dataCards, state.progress);
    state.progress = saveProgress(state.progress);

    renderCategoryFilter(state.cards);
    bindEvents();

    const restored = restoreSessionFromQuery();
    if (!restored) {
      buildQueue();
    }

    renderHistory();
    renderCard();
    setFeedback("Session prête. Retourne une carte pour commencer.");
  } catch (_error) {
    setFeedback("Erreur de chargement des flashcards.", "is-error");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFlashcardsPage, { once: true });
} else {
  initFlashcardsPage();
}
