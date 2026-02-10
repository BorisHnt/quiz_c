import { loadProgress, saveProgress, shuffleArray } from "./main.js";

const REVIEW_INTERVALS_DAYS = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 14,
};

const UNKNOWN_DELAY_MS = 15 * 60 * 1000;

const ui = {
  category: null,
  progress: null,
  card: null,
  front: null,
  back: null,
  feedback: null,
  knownButton: null,
  unknownButton: null,
  restartButton: null,
};

const state = {
  cards: [],
  currentIndex: 0,
  isFlipped: false,
  isComplete: false,
  isTransitioning: false,
  progress: null,
};

function selectElements() {
  ui.category = document.querySelector("#categoryBadge");
  ui.progress = document.querySelector("#progressText");
  ui.card = document.querySelector("#flashcardElement");
  ui.front = document.querySelector("#flashcardFront");
  ui.back = document.querySelector("#flashcardBack");
  ui.feedback = document.querySelector("#flashcardFeedback");
  ui.knownButton = document.querySelector("#knownBtn");
  ui.unknownButton = document.querySelector("#unknownBtn");
  ui.restartButton = document.querySelector("#restartSessionBtn");

  return Object.values(ui).every((node) => node !== null);
}

function setFeedback(message, type = "") {
  ui.feedback.textContent = message;
  ui.feedback.classList.remove("success", "error");
  if (type) {
    ui.feedback.classList.add(type);
  }
}

function sanitizeCards(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter((item) => item && typeof item === "object")
    .filter(
      (item) =>
        typeof item.id === "string" &&
        typeof item.category === "string" &&
        typeof item.front === "string" &&
        typeof item.back === "string"
    )
    .map((item) => ({
      id: item.id,
      category: item.category,
      front: item.front,
      back: item.back,
      difficulty: typeof item.difficulty === "string" ? item.difficulty : "medium",
    }));
}

async function fetchFlashcards() {
  const response = await fetch("./data/flashcards.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Impossible de charger les flashcards.");
  }
  return sanitizeCards(await response.json());
}

function nextReviewFromBox(box, knew) {
  if (!knew) {
    return Date.now() + UNKNOWN_DELAY_MS;
  }
  const days = REVIEW_INTERVALS_DAYS[box] ?? 1;
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

function isCardDue(cardId, progress, nowTimestamp) {
  const record = progress.flashcards.cards[cardId];
  if (!record) {
    return true;
  }
  return Number(record.nextReviewAt) <= nowTimestamp;
}

function buildSession(allCards, progress) {
  const search = new URLSearchParams(window.location.search);
  const wantsResume = search.get("resume") === "1";

  if (wantsResume && Array.isArray(progress.flashcards.lastSessionIds) && progress.flashcards.lastSessionIds.length > 0) {
    const mapped = progress.flashcards.lastSessionIds
      .map((id) => allCards.find((card) => card.id === id))
      .filter(Boolean);

    if (mapped.length > 0) {
      state.currentIndex = Math.max(0, Math.min(progress.flashcards.sessionCursor, mapped.length));
      return mapped;
    }
  }

  const nowTimestamp = Date.now();
  const dueCards = allCards.filter((card) => isCardDue(card.id, progress, nowTimestamp));
  const cards = shuffleArray(dueCards.length > 0 ? dueCards : allCards);

  progress.flashcards.lastSessionIds = cards.map((card) => card.id);
  progress.flashcards.sessionCursor = 0;
  progress.flashcards.lastSessionAt = new Date().toISOString();
  state.currentIndex = 0;
  state.progress = saveProgress(progress);

  return cards;
}

function setActionButtonsEnabled(enabled) {
  ui.knownButton.disabled = !enabled;
  ui.unknownButton.disabled = !enabled;
}

function renderCard() {
  const total = state.cards.length;

  if (total === 0) {
    state.isComplete = true;
    ui.category.textContent = "Aucune donnée";
    ui.progress.textContent = "0 / 0";
    ui.front.textContent = "Aucune flashcard valide n'a été trouvée.";
    ui.back.textContent = "Ajoute des cartes dans data/flashcards.json.";
    setActionButtonsEnabled(false);
    ui.restartButton.classList.remove("hidden");
    return;
  }

  if (state.currentIndex >= total) {
    state.isComplete = true;
    ui.category.textContent = "Session terminée";
    ui.progress.textContent = `${total} / ${total}`;
    ui.card.classList.remove("is-flipped");
    ui.front.textContent = "Toutes les cartes de la session ont été traitées.";
    ui.back.textContent = "Lance une nouvelle session pour continuer la révision.";
    setFeedback("Session sauvegardée.", "success");
    setActionButtonsEnabled(false);
    ui.restartButton.classList.remove("hidden");

    if (state.progress) {
      state.progress.flashcards.sessionCursor = state.cards.length;
      state.progress = saveProgress(state.progress);
    }

    return;
  }

  state.isComplete = false;
  state.isFlipped = false;
  ui.card.classList.remove("is-flipped");
  ui.restartButton.classList.add("hidden");

  const currentCard = state.cards[state.currentIndex];
  ui.category.textContent = `${currentCard.category} · ${currentCard.difficulty}`;
  ui.progress.textContent = `${state.currentIndex + 1} / ${total}`;
  ui.front.textContent = currentCard.front;
  ui.back.textContent = currentCard.back;
  setActionButtonsEnabled(false);
  setFeedback("");
}

function flipCard() {
  if (state.isComplete || state.isTransitioning) {
    return;
  }

  state.isFlipped = !state.isFlipped;
  ui.card.classList.toggle("is-flipped", state.isFlipped);
  setActionButtonsEnabled(state.isFlipped);
}

function persistAnswer(card, knew) {
  const progress = state.progress ?? loadProgress();
  const records = progress.flashcards.cards;

  const currentRecord = records[card.id] ?? {
    box: 1,
    nextReviewAt: 0,
    lastSeen: 0,
    stats: { known: 0, unknown: 0 },
  };

  const previousBox = Number.isFinite(currentRecord.box) ? currentRecord.box : 1;
  const nextBox = knew ? Math.min(5, previousBox + 1) : Math.max(1, previousBox - 1);

  records[card.id] = {
    box: nextBox,
    nextReviewAt: nextReviewFromBox(nextBox, knew),
    lastSeen: Date.now(),
    stats: {
      known: (currentRecord.stats?.known ?? 0) + (knew ? 1 : 0),
      unknown: (currentRecord.stats?.unknown ?? 0) + (knew ? 0 : 1),
    },
  };

  progress.flashcards.reviewedCount += 1;
  progress.flashcards.streak = knew ? progress.flashcards.streak + 1 : 0;
  progress.flashcards.bestStreak = Math.max(progress.flashcards.bestStreak, progress.flashcards.streak);
  progress.flashcards.sessionCursor = state.currentIndex + 1;
  progress.flashcards.lastSessionAt = new Date().toISOString();

  state.progress = saveProgress(progress);
}

function answerCard(knew) {
  if (state.isComplete || state.isTransitioning || !state.isFlipped) {
    return;
  }

  const card = state.cards[state.currentIndex];
  state.isTransitioning = true;
  setActionButtonsEnabled(false);
  persistAnswer(card, knew);

  if (knew) {
    setFeedback("Réponse enregistrée: juste.", "success");
  } else {
    setFeedback("Réponse enregistrée: à revoir.", "error");
  }

  window.setTimeout(() => {
    state.currentIndex += 1;
    state.isTransitioning = false;
    renderCard();
  }, 460);
}

function bindEvents() {
  ui.card.addEventListener("click", flipCard);
  ui.knownButton.addEventListener("click", () => answerCard(true));
  ui.unknownButton.addEventListener("click", () => answerCard(false));

  ui.restartButton.addEventListener("click", () => {
    window.location.href = "flashcards.html";
  });

  document.addEventListener("keydown", (event) => {
    if (state.isComplete) {
      return;
    }

    const activeTag = document.activeElement?.tagName || "";
    const isFormTarget = ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(activeTag);

    if (event.code === "Space" && !isFormTarget) {
      event.preventDefault();
      flipCard();
      return;
    }

    if (event.code === "ArrowRight") {
      event.preventDefault();
      answerCard(true);
      return;
    }

    if (event.code === "ArrowLeft") {
      event.preventDefault();
      answerCard(false);
    }
  });
}

async function initFlashcardsPage() {
  if (!selectElements()) {
    return;
  }

  try {
    const cards = await fetchFlashcards();
    state.progress = loadProgress();
    state.cards = buildSession(cards, state.progress);

    bindEvents();
    renderCard();
  } catch (_error) {
    ui.category.textContent = "Erreur de chargement";
    ui.progress.textContent = "0 / 0";
    ui.front.textContent = "Les flashcards n'ont pas pu être chargées.";
    ui.back.textContent = "Vérifie le fichier data/flashcards.json.";
    setActionButtonsEnabled(false);
    setFeedback("Impossible d'initialiser la session.", "error");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFlashcardsPage, { once: true });
} else {
  initFlashcardsPage();
}
