import {
  initCommon,
  saveProgress,
  shuffleArray,
  createSeededRng,
  seedFromString,
  todayKey,
  recordPerformance,
} from "./main.js";

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

function sanitizeQuizData(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
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
  return weighted.slice(0, Math.min(count, weighted.length));
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
  if (theme === "patterns") {
    return "Patterns";
  }
  if (theme === "pieges") {
    return "Pièges";
  }
  if (theme === "reflexes_memoire") {
    return "Réflexes mémoire";
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
  themeSelect: null,
  timerSelect: null,
  countSelect: null,
  penaltySelect: null,
  startBtn: null,
  historyList: null,
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
  ui.themeSelect = document.querySelector("#quizThemeSelect");
  ui.timerSelect = document.querySelector("#timerPerQuestionSelect");
  ui.countSelect = document.querySelector("#questionCountSelect");
  ui.penaltySelect = document.querySelector("#timePenaltySelect");
  ui.startBtn = document.querySelector("#startQuizBtn");
  ui.historyList = document.querySelector("#quizHistoryList");
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

  return Object.values(ui).every((node) => node !== null);
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

function renderHistory() {
  ui.historyList.innerHTML = "";
  const history = [...state.progress.quiz.sessions].slice(-8).reverse();

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
      `${date} | ${themeLabel(session.theme || "random")} | ${session.score}/${session.total} (${percent}%) | pénalité ${session.penalty}s`;
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

  const status = item.isCorrect ? "Correct" : item.timedOut ? "Temps écoulé" : "Incorrect";
  ui.resultDetail.textContent =
    `Q${index + 1} | ${status} | Répondu: ${item.selected} | Attendu: ${item.correct} | ${item.explanation}`;
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
  ui.penalty.textContent = `${state.penaltyTotal}s`;
}

function setTimerDisplay(seconds) {
  ui.timer.textContent = formatTimer(seconds);
  ui.timer.classList.toggle("is-critical", seconds <= 5);
}

function getQuestionTime() {
  const available = Math.max(5, state.timerPerQuestion - Math.min(state.penaltyCarry, state.timerPerQuestion - 5));
  const used = state.timerPerQuestion - available;
  state.penaltyCarry = Math.max(0, state.penaltyCarry - used);
  return available;
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
    state.penaltyTotal += state.penaltySeconds;
    state.penaltyCarry += state.penaltySeconds;
    recordPerformance(state.progress, false);
  }

  updateTopStats();
  disableChoices();
  markChoices(question.correct, selectedIndex);

  if (isCorrect) {
    setFeedback(`Bonne réponse. ${question.explanation}`, "is-success");
  } else if (timedOut) {
    setFeedback(`Temps écoulé. Réponse attendue: ${correctText}. ${question.explanation}`, "is-error");
  } else {
    setFeedback(`Réponse incorrecte. Attendu: ${correctText}. ${question.explanation}`, "is-error");
  }

  ui.nextBtn.classList.remove("hidden");
  ui.nextBtn.textContent = state.index < state.sessionQuestions.length - 1 ? "Question suivante" : "Voir le résultat";
  ui.nextBtn.focus();
}

function renderQuestion() {
  const question = currentQuestion();
  if (!question) {
    return;
  }

  state.answered = false;
  updateTopStats();

  ui.question.textContent = question.question;
  ui.choices.innerHTML = "";
  ui.nextBtn.classList.add("hidden");

  question.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.setAttribute("role", "listitem");
    button.textContent = `${index + 1}. ${choice}`;
    button.addEventListener("click", () => evaluateAnswer(index));
    ui.choices.appendChild(button);
  });

  setFeedback("Sélectionne la meilleure réponse.");

  const perQuestionTime = getQuestionTime();
  state.timer.start(perQuestionTime);
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

  const adjustedScore = Math.max(0, state.score - Math.floor(state.penaltyTotal / Math.max(1, state.timerPerQuestion)));

  ui.finalTheme.textContent = `Thème: ${themeLabel(state.selectedTheme)}`;
  ui.finalScore.textContent =
    `Score brut: ${state.score}/${state.sessionQuestions.length} | Score ajusté pénalité: ${adjustedScore}/${state.sessionQuestions.length}`;
  ui.finalPenalty.textContent = `Pénalité cumulée: ${state.penaltyTotal}s`;
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
  const selectedTheme = ui.themeSelect.value;
  const requestedTimer = Number.parseInt(ui.timerSelect.value, 10);
  const requestedCount = Number.parseInt(ui.countSelect.value, 10);
  const penaltySeconds = Number.parseInt(ui.penaltySelect.value, 10);

  state.selectedTheme = selectedTheme;
  state.timerPerQuestion = Number.isFinite(requestedTimer) ? requestedTimer : 20;
  state.penaltySeconds = Number.isFinite(penaltySeconds) ? penaltySeconds : 3;
  state.penaltyTotal = 0;
  state.penaltyCarry = 0;
  state.score = 0;
  state.index = 0;
  state.sessionErrors = [];
  state.sessionResults = [];
  state.selectedResultIndex = -1;

  const weaknessInfo = buildWeaknessMap(state.progress);
  const seed = seedFromString(`${todayKey()}-quiz-${state.selectedTheme}-${state.progress.quiz.errors.length}`);
  const rng = createSeededRng(seed);
  const themedQuestions =
    state.selectedTheme === "random"
      ? state.allQuestions
      : state.allQuestions.filter((question) => question.theme === state.selectedTheme);
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

function goToNextQuestion() {
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

function bindEvents() {
  ui.startBtn.addEventListener("click", startSession);
  ui.nextBtn.addEventListener("click", goToNextQuestion);

  ui.restartBtn.addEventListener("click", () => {
    ui.finalPanel.classList.add("hidden");
    ui.setupPanel.classList.remove("hidden");
  });

  ui.exportBtn.addEventListener("click", exportErrorsAsJson);

  document.addEventListener("keydown", (event) => {
    if (ui.sessionPanel.classList.contains("hidden")) {
      return;
    }

    if (state.answered) {
      if (event.key === "Enter") {
        event.preventDefault();
        goToNextQuestion();
      }
      return;
    }

    if (/^[1-9]$/.test(event.key)) {
      const idx = Number.parseInt(event.key, 10) - 1;
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
    state.progress = initCommon("quiz", "quiz.html");
    state.allQuestions = await fetchQuiz();

    state.timer = new QuestionTimer(setTimerDisplay, () => evaluateAnswer(-1, true));
    bindEvents();
    renderHistory();
    const params = new URLSearchParams(window.location.search);
    const themeFromQuery = params.get("theme");
    if (
      [
        "random",
        "patterns",
        "pieges",
        "reflexes_memoire",
        "pointeurs_malloc",
        "listes_chainees",
        "conditions_limites",
        "regles_implicites",
      ].includes(themeFromQuery)
    ) {
      ui.themeSelect.value = themeFromQuery;
    }

    setFeedback("Configure le quiz puis démarre la session.");
  } catch (_error) {
    setFeedback("Erreur de chargement des questions.", "is-error");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initQuizPage, { once: true });
} else {
  initQuizPage();
}
