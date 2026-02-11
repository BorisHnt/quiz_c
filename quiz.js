import {
  initCommon,
  saveProgress,
  shuffleArray,
  createSeededRng,
  seedFromString,
  todayKey,
  recordPerformance,
} from "./main.js";

const REVISION_MODE_KEY = "c_revision_quiz_revision_mode_v1";

class QuestionTimer {
  constructor(onTick, onExpire) {
    this.onTick = onTick;
    this.onExpire = onExpire;
    this.intervalId = null;
    this.deadline = 0;
    this.remainingMs = 0;
  }

  start(seconds) {
    this.stop();
    this.remainingMs = Math.max(0, seconds * 1000);
    this.deadline = Date.now() + this.remainingMs;
    this.tick();
    this.intervalId = window.setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  tick() {
    this.remainingMs = Math.max(0, this.deadline - Date.now());
    const remainingSeconds = Math.ceil(this.remainingMs / 1000);
    this.onTick(remainingSeconds);

    if (this.remainingMs <= 0) {
      this.stop();
      this.onExpire();
    }
  }
}

function normalizeQuizText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sanitizeQuizData(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  const sanitized = payload
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: typeof item.id === "string" && item.id.trim().length > 0 ? item.id.trim() : "",
      question: typeof item.question === "string" ? item.question.trim() : "",
      choices: Array.isArray(item.choices) ? item.choices.filter((choice) => typeof choice === "string") : [],
      correct: Number.isInteger(item.correct) ? item.correct : -1,
      explanation: typeof item.explanation === "string" ? item.explanation.trim() : "",
      theme: typeof item.theme === "string" ? item.theme : "patterns",
      tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === "string") : [],
    }))
    .filter(
      (item) =>
        item.question.length > 0 &&
        item.choices.length >= 2 &&
        item.correct >= 0 &&
        item.correct < item.choices.length
    );

  const seenIds = new Set();
  const seenQuestions = new Set();

  return sanitized.filter((item, index) => {
    const normalizedQuestion = normalizeQuizText(item.question);
    const fallbackId = `auto-${index + 1}-${normalizedQuestion}`;
    const nextId = item.id || fallbackId;

    if (seenIds.has(nextId) || seenQuestions.has(normalizedQuestion)) {
      return false;
    }

    seenIds.add(nextId);
    seenQuestions.add(normalizedQuestion);
    item.id = nextId;
    return true;
  });
}

function formatTimer(seconds) {
  const safe = Math.max(0, seconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function buildWeaknessMap(progress) {
  const weaknessByTag = new Map();

  Object.values(progress.flashcards.records).forEach((record) => {
    const total = record.successCount + record.failCount;
    const failRate = total > 0 ? record.failCount / total : 0;
    const weakValue = failRate * 3 + Math.max(0, record.failCount - record.successCount) * 0.2;

    if (weakValue > 0) {
      const key = String(record.category || "").toLowerCase();
      weaknessByTag.set(key, (weaknessByTag.get(key) || 0) + weakValue);
    }
  });

  progress.quiz.errors.forEach((error) => {
    error.tags.forEach((tag) => {
      const key = String(tag || "").toLowerCase();
      weaknessByTag.set(key, (weaknessByTag.get(key) || 0) + 1.2);
    });
  });

  const questionMistakes = new Map();
  progress.quiz.errors.forEach((error) => {
    const key = error.question;
    questionMistakes.set(key, (questionMistakes.get(key) || 0) + 1);
  });

  return { weaknessByTag, questionMistakes };
}

function questionWeight(question, weaknessInfo) {
  const { weaknessByTag, questionMistakes } = weaknessInfo;
  let weight = 1;

  question.tags.forEach((tag) => {
    weight += weaknessByTag.get(String(tag).toLowerCase()) || 0;
  });

  weight += (questionMistakes.get(question.question) || 0) * 1.4;
  return Math.max(0.1, weight);
}

function weightedOrder(items, weightFn, rng) {
  const pool = items.map((item) => ({ item, weight: Math.max(0.001, weightFn(item)) }));
  const out = [];

  while (pool.length > 0) {
    const totalWeight = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let pick = rng() * totalWeight;
    let chosenIndex = 0;

    for (let i = 0; i < pool.length; i += 1) {
      pick -= pool[i].weight;
      if (pick <= 0) {
        chosenIndex = i;
        break;
      }
    }

    out.push(pool[chosenIndex].item);
    pool.splice(chosenIndex, 1);
  }

  return out;
}

function buildQuestionSet(allQuestions, count, weaknessInfo, rng) {
  const weighted = weightedOrder(allQuestions, (question) => questionWeight(question, weaknessInfo), rng);
  const seenIds = new Set();
  const seenQuestions = new Set();
  const unique = [];

  for (const question of weighted) {
    const idKey = String(question.id || "");
    const questionKey = normalizeQuizText(question.question);
    if (seenIds.has(idKey) || seenQuestions.has(questionKey)) {
      continue;
    }
    seenIds.add(idKey);
    seenQuestions.add(questionKey);
    unique.push(question);

    if (unique.length >= count) {
      break;
    }
  }

  return unique;
}

function remapQuestionChoices(question, rng) {
  const mapped = question.choices.map((choice, index) => ({ choice, index }));
  const shuffled = shuffleArray(mapped, rng);
  const newCorrect = shuffled.findIndex((item) => item.index === question.correct);

  return {
    ...question,
    choices: shuffled.map((item) => item.choice),
    correct: newCorrect >= 0 ? newCorrect : question.correct,
  };
}

function themeLabel(theme) {
  if (theme === "general") {
    return "General";
  }
  if (theme === "patterns") {
    return "Patterns";
  }
  if (theme === "pieges") {
    return "Pièges";
  }
  if (theme === "reflexes_memoire") {
    return "Réflexes mémoire";
  }
  if (theme === "pointeurs") {
    return "Pointeurs";
  }
  if (theme === "malloc") {
    return "Malloc";
  }
  if (theme === "pointeurs_malloc") {
    return "Pointeurs & malloc";
  }
  if (theme === "listes_chainees") {
    return "Listes chaînées";
  }
  if (theme === "conditions_limites") {
    return "Conditions limites";
  }
  if (theme === "regles_implicites") {
    return "Règles implicites";
  }
  return "Random";
}

const ui = {
  setupPanel: null,
  themeSelector: null,
  themeButtons: [],
  sessionSizeSelector: null,
  sessionButtons: [],
  timerSelect: null,
  penaltySelect: null,
  revisionBtn: null,
  startBtn: null,
  dataStatus: null,
  historyList: null,
  historyCount: null,
  clearHistoryBtn: null,
  sessionPanel: null,
  progress: null,
  score: null,
  penalty: null,
  timer: null,
  question: null,
  choices: null,
  feedback: null,
  nextBtn: null,
  finalPanel: null,
  finalTheme: null,
  finalScore: null,
  finalPenalty: null,
  resultGrid: null,
  resultDetail: null,
  errorsList: null,
  restartBtn: null,
  exportBtn: null,
};

const state = {
  progress: null,
  allQuestions: [],
  sessionQuestions: [],
  index: 0,
  score: 0,
  answered: false,
  selectedChoice: -1,
  sessionSize: 20,
  revisionMode: false,
  reviewPause: false,
  selectedTheme: "random",
  timerPerQuestion: 20,
  penaltySeconds: 3,
  penaltyTotal: 0,
  penaltyCarry: 0,
  timer: null,
  sessionErrors: [],
  sessionResults: [],
  selectedResultIndex: -1,
};

function selectUi() {
  ui.setupPanel = document.querySelector("#quizSetupPanel");
  ui.themeSelector = document.querySelector("#quizThemeSelector");
  ui.themeButtons = Array.from(document.querySelectorAll("#quizThemeSelector .theme-btn"));
  ui.sessionSizeSelector = document.querySelector("#sessionSizeSelector");
  ui.sessionButtons = Array.from(document.querySelectorAll("#sessionSizeSelector .session-btn"));
  ui.timerSelect = document.querySelector("#timerPerQuestionSelect");
  ui.penaltySelect = document.querySelector("#timePenaltySelect");
  ui.revisionBtn = document.querySelector("#revisionModeBtn");
  ui.startBtn = document.querySelector("#startQuizBtn");
  ui.dataStatus = document.querySelector("#quizDataStatus");
  ui.historyList = document.querySelector("#quizHistoryList");
  ui.historyCount = document.querySelector("#quizHistoryCount");
  ui.clearHistoryBtn = document.querySelector("#clearQuizHistoryBtn");
  ui.sessionPanel = document.querySelector("#quizSessionPanel");
  ui.progress = document.querySelector("#quizProgress");
  ui.score = document.querySelector("#quizScore");
  ui.penalty = document.querySelector("#quizPenalty");
  ui.timer = document.querySelector("#quizTimer");
  ui.question = document.querySelector("#quizQuestion");
  ui.choices = document.querySelector("#quizChoices");
  ui.feedback = document.querySelector("#quizFeedback");
  ui.nextBtn = document.querySelector("#nextQuestionBtn");
  ui.finalPanel = document.querySelector("#quizFinalPanel");
  ui.finalTheme = document.querySelector("#finalThemeText");
  ui.finalScore = document.querySelector("#finalScoreText");
  ui.finalPenalty = document.querySelector("#finalPenaltyText");
  ui.resultGrid = document.querySelector("#quizResultGrid");
  ui.resultDetail = document.querySelector("#quizResultDetail");
  ui.errorsList = document.querySelector("#quizErrorsList");
  ui.restartBtn = document.querySelector("#restartQuizBtn");
  ui.exportBtn = document.querySelector("#exportErrorsBtn");

  return (
    Object.values(ui).every((node) => node !== null) &&
    ui.themeButtons.length > 0 &&
    ui.sessionButtons.length > 0
  );
}

function ensureTimerSelectOptions() {
  const allowedValues = new Set(["0", "10", "15", "20", "30"]);
  if (!ui.timerSelect) {
    return;
  }

  const hasNoTimer = Array.from(ui.timerSelect.options).some((option) => option.value === "0");
  if (!hasNoTimer) {
    const noTimerOption = document.createElement("option");
    noTimerOption.value = "0";
    noTimerOption.textContent = "Sans chrono";
    ui.timerSelect.insertBefore(noTimerOption, ui.timerSelect.firstChild);
  }

  if (!allowedValues.has(ui.timerSelect.value)) {
    ui.timerSelect.value = "20";
  }
}

function setFeedback(message, type = "") {
  ui.feedback.textContent = message;
  ui.feedback.classList.remove("is-success", "is-error");
  if (type) {
    ui.feedback.classList.add(type);
  }
}

async function fetchQuiz() {
  const response = await fetch("./data/quiz.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Impossible de charger le quiz.");
  }
  return sanitizeQuizData(await response.json());
}

function sessionPercent(session) {
  if (!session || !Number.isFinite(session.total) || session.total <= 0) {
    return 0;
  }
  return Math.round((session.score / session.total) * 100);
}

function availableSessionSizes(theme) {
  if (theme === "random") {
    return [10, 20, 40];
  }
  if (theme === "general") {
    return [10, 20, 50];
  }
  return [10, 20];
}

function matchesSelectedTheme(question, selectedTheme) {
  if (selectedTheme === "random") {
    return true;
  }

  if (selectedTheme === "pointeurs_malloc") {
    return (
      question.theme === "pointeurs_malloc" ||
      question.theme === "pointeurs" ||
      question.theme === "malloc"
    );
  }

  return question.theme === selectedTheme;
}

function questionPoolCount(theme) {
  return state.allQuestions.filter((question) => matchesSelectedTheme(question, theme)).length;
}

function syncSessionButtons() {
  const allowed = availableSessionSizes(state.selectedTheme);
  if (!allowed.includes(state.sessionSize)) {
    state.sessionSize = allowed[allowed.length - 1];
  }

  ui.sessionButtons.forEach((button) => {
    const size = Number.parseInt(button.dataset.size, 10);
    const isAllowed = allowed.includes(size);
    button.classList.toggle("hidden", !isAllowed);
    button.classList.toggle("is-active", isAllowed && size === state.sessionSize);
  });
}

function setActiveTheme(theme) {
  const allowed = new Set([
    "random",
    "general",
    "patterns",
    "pieges",
    "reflexes_memoire",
    "pointeurs",
    "malloc",
    "pointeurs_malloc",
    "listes_chainees",
    "conditions_limites",
    "regles_implicites",
  ]);
  const next = allowed.has(theme) ? theme : "random";
  state.selectedTheme = next;

  ui.themeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.theme === next);
  });

  syncSessionButtons();
  renderDataStatus();
}

function setSessionSize(size) {
  const parsed = Number.parseInt(String(size), 10);
  const allowed = availableSessionSizes(state.selectedTheme);
  const next = allowed.includes(parsed) ? parsed : 20;
  state.sessionSize = next;
  syncSessionButtons();
}

function renderRevisionButton() {
  ui.revisionBtn.classList.toggle("is-active", state.revisionMode);
  ui.revisionBtn.setAttribute("aria-pressed", String(state.revisionMode));
}

function renderDataStatus() {
  const count = questionPoolCount(state.selectedTheme);
  ui.dataStatus.textContent = `${count} questions prêtes.`;
}

function renderHistory() {
  ui.historyList.innerHTML = "";
  const history = [...state.progress.quiz.sessions].slice(-8).reverse();
  ui.historyCount.textContent = String(state.progress.quiz.sessions.length);

  if (history.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Aucune session enregistrée.";
    ui.historyList.appendChild(li);
    return;
  }

  history.forEach((session) => {
    const li = document.createElement("li");
    const date = new Date(session.date).toLocaleString("fr-FR");
    const percent = sessionPercent(session);
    li.textContent =
      `${themeLabel(session.theme || "random")} | ${session.score}/${session.total} (${percent}%) | pénalité ${session.penalty}s | ${date}`;
    ui.historyList.appendChild(li);
  });
}

function renderResultDetail(index) {
  const item = state.sessionResults[index];
  state.selectedResultIndex = index;

  ui.resultGrid.querySelectorAll(".result-cell").forEach((cell, cellIndex) => {
    cell.classList.toggle("is-active", cellIndex === index);
  });

  if (!item) {
    ui.resultDetail.textContent = "Aucun détail disponible.";
    return;
  }

  const status = item.isCorrect ? "Correcte" : item.timedOut ? "Temps écoulé" : "A revoir";
  ui.resultDetail.textContent =
    `Q${index + 1} | ${status} | Ta réponse: ${item.selected} | Réponse attendue: ${item.correct} | ${item.explanation}`;
}

function renderResultGrid() {
  ui.resultGrid.innerHTML = "";
  ui.resultDetail.textContent = "";
  state.selectedResultIndex = -1;

  if (state.sessionResults.length === 0) {
    ui.resultDetail.textContent = "Aucun résultat de session.";
    return;
  }

  state.sessionResults.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-cell";
    button.setAttribute("role", "listitem");
    button.textContent = String(index + 1);
    button.title = item.isCorrect ? `Question ${index + 1}: correcte` : `Question ${index + 1}: incorrecte`;

    if (item.isCorrect) {
      button.classList.add("is-correct");
    } else if (item.timedOut) {
      button.classList.add("is-timeout");
    } else {
      button.classList.add("is-wrong");
    }

    button.addEventListener("click", () => renderResultDetail(index));
    ui.resultGrid.appendChild(button);
  });

  const firstErrorIndex = state.sessionResults.findIndex((item) => !item.isCorrect);
  renderResultDetail(firstErrorIndex >= 0 ? firstErrorIndex : 0);
}

function updateTopStats() {
  ui.progress.textContent = `${Math.min(state.index + 1, state.sessionQuestions.length)} / ${state.sessionQuestions.length}`;
  ui.score.textContent = String(state.score);
  ui.penalty.textContent = state.timerPerQuestion > 0 ? `${state.penaltyTotal}s` : "Sans chrono";
}

function setTimerDisplay(seconds) {
  if (!Number.isFinite(seconds)) {
    ui.timer.textContent = "Sans chrono";
    ui.timer.classList.remove("is-critical");
    return;
  }
  ui.timer.textContent = formatTimer(seconds);
  ui.timer.classList.toggle("is-critical", seconds <= 5);
}

function getQuestionTime() {
  if (state.timerPerQuestion <= 0) {
    return null;
  }

  const base = Math.max(1, state.timerPerQuestion);
  const minTime = Math.min(5, base);
  const maxReducible = Math.max(0, base - minTime);
  const used = Math.min(state.penaltyCarry, maxReducible);
  state.penaltyCarry = Math.max(0, state.penaltyCarry - used);
  return base - used;
}

function currentQuestion() {
  return state.sessionQuestions[state.index] || null;
}

function disableChoices() {
  ui.choices.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
}

function markChoices(correctIndex, selectedIndex) {
  const buttons = Array.from(ui.choices.querySelectorAll("button"));
  buttons.forEach((button, idx) => {
    if (idx === correctIndex) {
      button.classList.add("is-correct");
    }
    if (idx === selectedIndex && selectedIndex !== correctIndex) {
      button.classList.add("is-wrong");
    }
  });
}

function highlightSelectedChoice() {
  const buttons = Array.from(ui.choices.querySelectorAll("button"));
  buttons.forEach((button, idx) => {
    button.classList.toggle("is-selected", idx === state.selectedChoice && !state.answered);
  });
}

function setSelectedChoice(index) {
  if (state.answered || state.reviewPause) {
    return;
  }
  state.selectedChoice = index;
  highlightSelectedChoice();
  setFeedback("Top, réponse sélectionnée. Clique sur Suivant pour valider.");
}

function registerError(question, selectedIndex) {
  const selectedText = selectedIndex >= 0 ? question.choices[selectedIndex] : "Aucune réponse";
  const errorEntry = {
    date: new Date().toISOString(),
    question: question.question,
    selected: selectedText,
    correct: question.choices[question.correct],
    tags: [...question.tags],
    mode: "quiz",
  };
  state.sessionErrors.push(errorEntry);
}

function evaluateAnswer(selectedIndex, timedOut = false) {
  const question = currentQuestion();
  if (!question || state.answered) {
    return;
  }

  state.answered = true;
  state.timer.stop();

  const isCorrect = selectedIndex === question.correct;
  const selectedText = selectedIndex >= 0 ? question.choices[selectedIndex] : "Aucune réponse";
  const correctText = question.choices[question.correct];
  state.reviewPause = state.revisionMode && !isCorrect;

  state.sessionResults[state.index] = {
    question: question.question,
    selected: selectedText,
    correct: correctText,
    explanation: question.explanation,
    isCorrect,
    timedOut,
  };

  if (isCorrect) {
    state.score += 1;
    recordPerformance(state.progress, true);
  } else {
    registerError(question, selectedIndex);
    if (state.timerPerQuestion > 0) {
      state.penaltyTotal += state.penaltySeconds;
      state.penaltyCarry += state.penaltySeconds;
    }
    recordPerformance(state.progress, false);
  }

  updateTopStats();
  disableChoices();
  markChoices(question.correct, selectedIndex);

  if (isCorrect) {
    setFeedback(`Bien joué, c'est la bonne réponse. ${question.explanation}`, "is-success");
  } else if (timedOut) {
    setFeedback(
      `Le temps est écoulé. La bonne réponse était: ${correctText}. ${question.explanation}${
        state.reviewPause ? " Clique sur Suivant pour continuer." : ""
      }`,
      "is-error"
    );
  } else {
    setFeedback(
      `Pas grave, tu progresses. La bonne réponse était: ${correctText}. ${question.explanation}${
        state.reviewPause ? " Clique sur Suivant pour continuer." : ""
      }`,
      "is-error"
    );
  }

  if (state.reviewPause) {
    ui.nextBtn.textContent = "Continuer";
  } else {
    ui.nextBtn.textContent = state.index < state.sessionQuestions.length - 1 ? "Question suivante" : "Voir le résultat";
  }
  ui.nextBtn.focus();
}

function renderQuestion() {
  const question = currentQuestion();
  if (!question) {
    return;
  }

  state.answered = false;
  state.selectedChoice = -1;
  state.reviewPause = false;
  updateTopStats();

  ui.question.textContent = question.question;
  ui.choices.innerHTML = "";
  ui.nextBtn.classList.remove("hidden");
  ui.nextBtn.textContent = state.index < state.sessionQuestions.length - 1 ? "Valider" : "Terminer";

  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.setAttribute("role", "listitem");
    button.textContent = `${String.fromCharCode(65 + index)}. ${choice}`;
    button.addEventListener("click", () => setSelectedChoice(index));
    ui.choices.appendChild(button);
  });

  setFeedback("Lis la question, choisis la meilleure option, puis valide.");

  const perQuestionTime = getQuestionTime();
  if (Number.isFinite(perQuestionTime) && perQuestionTime > 0) {
    state.timer.start(perQuestionTime);
  } else {
    state.timer.stop();
    setTimerDisplay(Number.NaN);
  }
}

function finishQuiz() {
  state.timer.stop();

  state.progress.quiz.sessions.push({
    date: new Date().toISOString(),
    mode: "quiz",
    theme: state.selectedTheme,
    score: state.score,
    total: state.sessionQuestions.length,
    penalty: state.penaltyTotal,
    timer: state.timerPerQuestion,
  });
  state.progress.quiz.sessions = state.progress.quiz.sessions.slice(-150);

  state.progress.quiz.errors = [...state.sessionErrors, ...state.progress.quiz.errors].slice(0, 300);
  state.progress = saveProgress(state.progress);
  renderHistory();

  ui.sessionPanel.classList.add("hidden");
  ui.finalPanel.classList.remove("hidden");

  const timerEnabled = state.timerPerQuestion > 0;
  const adjustedScore = timerEnabled
    ? Math.max(0, state.score - Math.floor(state.penaltyTotal / Math.max(1, state.timerPerQuestion)))
    : state.score;

  ui.finalTheme.textContent = `Thème: ${themeLabel(state.selectedTheme)}`;
  ui.finalScore.textContent = timerEnabled
    ? `Score brut: ${state.score}/${state.sessionQuestions.length} | Score ajusté pénalité: ${adjustedScore}/${state.sessionQuestions.length}`
    : `Score: ${state.score}/${state.sessionQuestions.length} (sans chrono)`;
  ui.finalPenalty.textContent = timerEnabled
    ? `Pénalité cumulée: ${state.penaltyTotal}s`
    : "Chrono désactivé: aucune pénalité temps.";
  renderResultGrid();

  ui.errorsList.innerHTML = "";
  if (state.sessionErrors.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Aucune erreur sur cette session.";
    ui.errorsList.appendChild(li);
  } else {
    state.sessionErrors.forEach((error) => {
      const li = document.createElement("li");
      li.textContent = `${error.question} | attendu: ${error.correct} | répondu: ${error.selected}`;
      ui.errorsList.appendChild(li);
    });
  }
}

function startSession() {
  const requestedTimer = Number.parseInt(ui.timerSelect.value, 10);
  const requestedCount = state.sessionSize;
  const penaltySeconds = Number.parseInt(ui.penaltySelect.value, 10);
  state.timerPerQuestion = Number.isFinite(requestedTimer) && requestedTimer >= 0 ? requestedTimer : 20;
  state.penaltySeconds = Number.isFinite(penaltySeconds) ? penaltySeconds : 3;
  state.penaltyTotal = 0;
  state.penaltyCarry = 0;
  state.score = 0;
  state.index = 0;
  state.answered = false;
  state.selectedChoice = -1;
  state.reviewPause = false;
  state.sessionErrors = [];
  state.sessionResults = [];
  state.selectedResultIndex = -1;
  localStorage.setItem(REVISION_MODE_KEY, state.revisionMode ? "1" : "0");

  const weaknessInfo = buildWeaknessMap(state.progress);
  const seed = seedFromString(`${todayKey()}-quiz-${state.selectedTheme}-${state.progress.quiz.errors.length}`);
  const rng = createSeededRng(seed);
  const themedQuestions = state.allQuestions.filter((question) =>
    matchesSelectedTheme(question, state.selectedTheme)
  );
  const selectedQuestions = buildQuestionSet(themedQuestions, requestedCount, weaknessInfo, rng);
  state.sessionQuestions = selectedQuestions.map((question) => remapQuestionChoices(question, rng));

  if (state.sessionQuestions.length === 0) {
    setFeedback("Aucune question disponible pour cette session.", "is-error");
    return;
  }

  ui.setupPanel.classList.add("hidden");
  ui.finalPanel.classList.add("hidden");
  ui.sessionPanel.classList.remove("hidden");

  renderQuestion();
}

function submitCurrentQuestion(timedOut = false) {
  if (state.answered) {
    return true;
  }

  if (!timedOut && state.selectedChoice < 0) {
    setFeedback("Choisis une réponse avant de continuer.", "is-error");
    return false;
  }

  evaluateAnswer(timedOut ? -1 : state.selectedChoice, timedOut);
  return true;
}

function goToNextQuestion() {
  if (!state.answered) {
    if (!submitCurrentQuestion(false)) {
      return;
    }
    if (state.reviewPause) {
      return;
    }
  }

  if (state.reviewPause) {
    state.reviewPause = false;
  }

  if (!state.answered) {
    return;
  }

  state.index += 1;
  if (state.index >= state.sessionQuestions.length) {
    finishQuiz();
    return;
  }

  renderQuestion();
}

function exportErrorsAsJson() {
  const payload = JSON.stringify(state.progress.quiz.errors, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = `quiz-errors-${todayKey()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}

function syncTimerControls() {
  const timerValue = Number.parseInt(ui.timerSelect.value, 10);
  const timerEnabled = Number.isFinite(timerValue) && timerValue > 0;
  ui.penaltySelect.disabled = !timerEnabled;
  ui.penaltySelect.setAttribute("aria-disabled", String(!timerEnabled));
}

function bindEvents() {
  ui.startBtn.addEventListener("click", startSession);
  ui.nextBtn.addEventListener("click", goToNextQuestion);
  ui.timerSelect.addEventListener("change", syncTimerControls);

  ui.restartBtn.addEventListener("click", () => {
    ui.finalPanel.classList.add("hidden");
    ui.setupPanel.classList.remove("hidden");
  });

  ui.clearHistoryBtn.addEventListener("click", () => {
    state.progress.quiz.sessions = [];
    state.progress = saveProgress(state.progress);
    renderHistory();
    setFeedback("Historique vidé.");
  });

  ui.revisionBtn.addEventListener("click", () => {
    state.revisionMode = !state.revisionMode;
    localStorage.setItem(REVISION_MODE_KEY, state.revisionMode ? "1" : "0");
    renderRevisionButton();
  });

  ui.themeSelector.addEventListener("click", (event) => {
    const button = event.target.closest(".theme-btn");
    if (!button) {
      return;
    }
    setActiveTheme(button.dataset.theme || "random");
  });

  ui.sessionSizeSelector.addEventListener("click", (event) => {
    const button = event.target.closest(".session-btn");
    if (!button) {
      return;
    }
    setSessionSize(button.dataset.size || "20");
  });

  ui.exportBtn.addEventListener("click", exportErrorsAsJson);

  document.addEventListener("keydown", (event) => {
    if (ui.sessionPanel.classList.contains("hidden")) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      goToNextQuestion();
      return;
    }

    if (/^[1-9]$/.test(event.key)) {
      const idx = Number.parseInt(event.key, 10) - 1;
      const button = ui.choices.querySelectorAll("button")[idx];
      if (button) {
        button.click();
      }
      return;
    }

    if (/^[a-dA-D]$/.test(event.key)) {
      const idx = event.key.toUpperCase().charCodeAt(0) - 65;
      const button = ui.choices.querySelectorAll("button")[idx];
      if (button) {
        button.click();
      }
    }
  });
}

async function initQuizPage() {
  if (!selectUi()) {
    return;
  }

  try {
    ensureTimerSelectOptions();
    state.progress = initCommon("quiz", "quiz.html");
    state.allQuestions = await fetchQuiz();
    state.revisionMode = localStorage.getItem(REVISION_MODE_KEY) === "1";
    renderRevisionButton();
    renderDataStatus();
    setActiveTheme(state.selectedTheme);
    setSessionSize(state.sessionSize);

    state.timer = new QuestionTimer(setTimerDisplay, () => {
      submitCurrentQuestion(true);
    });
    syncTimerControls();
    bindEvents();
    renderHistory();
    const params = new URLSearchParams(window.location.search);
    const themeFromQuery = params.get("theme");
    if (
      [
        "random",
        "general",
        "patterns",
        "pieges",
        "reflexes_memoire",
        "pointeurs",
        "malloc",
        "pointeurs_malloc",
        "listes_chainees",
        "conditions_limites",
        "regles_implicites",
      ].includes(themeFromQuery)
    ) {
      setActiveTheme(themeFromQuery);
    }

    setFeedback("Configure ta session puis lance le quiz.");
  } catch (_error) {
    setFeedback("Impossible de charger les questions pour le moment.", "is-error");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initQuizPage, { once: true });
} else {
  initQuizPage();
}
