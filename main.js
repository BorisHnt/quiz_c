const STORAGE_KEY = "quiz_c_progress_v1";

/*
  Schéma localStorage (clé: quiz_c_progress_v1)
  {
    version: 1,
    flashcards: {
      cards: {
        [id]: {
          box: number,
          nextReviewAt: number,
          lastSeen: number,
          stats: { known: number, unknown: number }
        }
      },
      reviewedCount: number,
      streak: number,
      bestStreak: number,
      lastSessionIds: string[],
      sessionCursor: number,
      lastSessionAt: string|null
    },
    quiz: {
      sessions: [{ date: string, correct: number, total: number, percent: number }],
      mistakes: [{ date: string, question: string, correctAnswer: string, selectedAnswer: string }]
    },
    ui: {
      lastVisited: string,
      lastVisitedAt: string|null
    }
  }
*/

function createDefaultProgress() {
  return {
    version: 1,
    flashcards: {
      cards: {},
      reviewedCount: 0,
      streak: 0,
      bestStreak: 0,
      lastSessionIds: [],
      sessionCursor: 0,
      lastSessionAt: null,
    },
    quiz: {
      sessions: [],
      mistakes: [],
    },
    ui: {
      lastVisited: "index",
      lastVisitedAt: null,
    },
  };
}

function clampNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeProgress(progress) {
  const base = createDefaultProgress();

  if (!progress || typeof progress !== "object") {
    return base;
  }

  const source = progress;
  const normalized = {
    version: 1,
    flashcards: {
      cards: {},
      reviewedCount: clampNumber(source.flashcards?.reviewedCount, 0),
      streak: clampNumber(source.flashcards?.streak, 0),
      bestStreak: clampNumber(source.flashcards?.bestStreak, 0),
      lastSessionIds: Array.isArray(source.flashcards?.lastSessionIds)
        ? source.flashcards.lastSessionIds.filter((id) => typeof id === "string")
        : [],
      sessionCursor: clampNumber(source.flashcards?.sessionCursor, 0),
      lastSessionAt:
        typeof source.flashcards?.lastSessionAt === "string" ? source.flashcards.lastSessionAt : null,
    },
    quiz: {
      sessions: Array.isArray(source.quiz?.sessions)
        ? source.quiz.sessions
            .filter((session) => session && typeof session === "object")
            .map((session) => ({
              date: typeof session.date === "string" ? session.date : new Date().toISOString(),
              correct: clampNumber(session.correct, 0),
              total: clampNumber(session.total, 0),
              percent: clampNumber(session.percent, 0),
            }))
        : [],
      mistakes: Array.isArray(source.quiz?.mistakes)
        ? source.quiz.mistakes
            .filter((mistake) => mistake && typeof mistake === "object")
            .map((mistake) => ({
              date: typeof mistake.date === "string" ? mistake.date : new Date().toISOString(),
              question: typeof mistake.question === "string" ? mistake.question : "",
              correctAnswer: typeof mistake.correctAnswer === "string" ? mistake.correctAnswer : "",
              selectedAnswer: typeof mistake.selectedAnswer === "string" ? mistake.selectedAnswer : "",
            }))
        : [],
    },
    ui: {
      lastVisited: typeof source.ui?.lastVisited === "string" ? source.ui.lastVisited : "index",
      lastVisitedAt: typeof source.ui?.lastVisitedAt === "string" ? source.ui.lastVisitedAt : null,
    },
  };

  const cardMap = source.flashcards?.cards;
  if (cardMap && typeof cardMap === "object") {
    Object.entries(cardMap).forEach(([id, record]) => {
      if (typeof id !== "string" || !record || typeof record !== "object") {
        return;
      }
      normalized.flashcards.cards[id] = {
        box: Math.min(5, Math.max(1, clampNumber(record.box, 1))),
        nextReviewAt: clampNumber(record.nextReviewAt, 0),
        lastSeen: clampNumber(record.lastSeen, 0),
        stats: {
          known: clampNumber(record.stats?.known, 0),
          unknown: clampNumber(record.stats?.unknown, 0),
        },
      };
    });
  }

  return { ...base, ...normalized };
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

export function shuffleArray(input) {
  const array = Array.isArray(input) ? [...input] : [];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function setupNavigation() {
  const toggle = document.querySelector("#navToggle");
  const menu = document.querySelector("#navMenu");

  if (!toggle || !menu) {
    return;
  }

  const closeMenu = () => {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}

function setupPageTransitions() {
  const internalLinks = document.querySelectorAll('a[href$=".html"], a[href*=".html?"]');
  internalLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented) {
        return;
      }
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || link.target === "_blank") {
        return;
      }
      event.preventDefault();
      document.body.classList.add("is-leaving");
      window.setTimeout(() => {
        window.location.href = href;
      }, 120);
    });
  });
}

function updateDashboard() {
  const cardsReviewedNode = document.querySelector("#cardsReviewedStat");
  const successRateNode = document.querySelector("#successRateStat");
  const streakNode = document.querySelector("#streakStat");
  const resumeButton = document.querySelector("#resumeSessionBtn");

  if (!cardsReviewedNode || !successRateNode || !streakNode || !resumeButton) {
    return;
  }

  const progress = loadProgress();
  const allCardRecords = Object.values(progress.flashcards.cards);

  const cardKnown = allCardRecords.reduce((sum, record) => sum + clampNumber(record.stats?.known, 0), 0);
  const cardUnknown = allCardRecords.reduce((sum, record) => sum + clampNumber(record.stats?.unknown, 0), 0);

  const quizCorrect = progress.quiz.sessions.reduce((sum, session) => sum + clampNumber(session.correct, 0), 0);
  const quizTotal = progress.quiz.sessions.reduce((sum, session) => sum + clampNumber(session.total, 0), 0);

  const totalAttempts = cardKnown + cardUnknown + quizTotal;
  const success = totalAttempts > 0 ? Math.round(((cardKnown + quizCorrect) / totalAttempts) * 100) : 0;

  cardsReviewedNode.textContent = String(progress.flashcards.reviewedCount);
  successRateNode.textContent = `${success}%`;
  streakNode.textContent = String(progress.flashcards.streak);

  const hasResumeFlashcards =
    progress.flashcards.lastSessionIds.length > 0 &&
    progress.flashcards.sessionCursor < progress.flashcards.lastSessionIds.length;

  if (hasResumeFlashcards) {
    resumeButton.classList.remove("hidden");
    resumeButton.textContent = "Reprendre la dernière session";
    resumeButton.setAttribute("href", "flashcards.html?resume=1");
    return;
  }

  if (progress.ui.lastVisited === "quiz") {
    resumeButton.classList.remove("hidden");
    resumeButton.textContent = "Relancer un quiz";
    resumeButton.setAttribute("href", "quiz.html");
    return;
  }

  resumeButton.classList.add("hidden");
}

function markLastVisitedPage() {
  const page = document.body.dataset.page || "index";
  const progress = loadProgress();
  progress.ui.lastVisited = page;
  progress.ui.lastVisitedAt = new Date().toISOString();
  saveProgress(progress);
}

function initMain() {
  setupNavigation();
  setupPageTransitions();
  markLastVisitedPage();

  if (document.body.dataset.page === "index") {
    updateDashboard();
  }

  document.body.classList.add("is-ready");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMain, { once: true });
} else {
  initMain();
}
