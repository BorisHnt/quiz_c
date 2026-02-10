import { loadProgress, saveProgress, shuffleArray } from "./main.js";

const QUESTION_TIME_SECONDS = 20;
const LOW_TIME_THRESHOLD_SECONDS = 5;

class CountdownTimer {
  constructor(durationSeconds, onTick, onExpire) {
    this.durationMs = durationSeconds * 1000;
    this.remainingMs = this.durationMs;
    this.onTick = onTick;
    this.onExpire = onExpire;
    this.intervalId = null;
    this.deadlineMs = 0;
  }

  start() {
    this.stop();
    this.deadlineMs = Date.now() + this.remainingMs;
    this.tick();
    this.intervalId = window.setInterval(() => this.tick(), 200);
  }

  stop() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset(durationSeconds = null) {
    if (durationSeconds !== null) {
      this.durationMs = durationSeconds * 1000;
    }
    this.remainingMs = this.durationMs;
    this.stop();
    this.onTick(Math.ceil(this.remainingMs / 1000));
  }

  tick() {
    const now = Date.now();
    this.remainingMs = Math.max(0, this.deadlineMs - now);
    const remainingSeconds = Math.ceil(this.remainingMs / 1000);
    this.onTick(remainingSeconds);

    if (this.remainingMs <= 0) {
      this.stop();
      this.onExpire();
    }
  }
}

const ui = {
  quizView: null,
  finalView: null,
  progress: null,
  timer: null,
  score: null,
  question: null,
  answers: null,
  feedback: null,
  nextButton: null,
  finalScore: null,
  finalSummary: null,
  mistakesList: null,
  restartButton: null,
};

const state = {
  loadedQuestions: [],
  questions: [],
  currentIndex: 0,
  score: 0,
  answered: false,
  mistakes: [],
  timer: null,
};

function selectElements() {
  ui.quizView = document.querySelector("#quizView");
  ui.finalView = document.querySelector("#quizFinalView");
  ui.progress = document.querySelector("#quizProgress");
  ui.timer = document.querySelector("#quizTimer");
  ui.score = document.querySelector("#quizScore");
  ui.question = document.querySelector("#quizQuestion");
  ui.answers = document.querySelector("#answersContainer");
  ui.feedback = document.querySelector("#quizFeedback");
  ui.nextButton = document.querySelector("#nextQuestionBtn");
  ui.finalScore = document.querySelector("#finalScore");
  ui.finalSummary = document.querySelector("#finalSummary");
  ui.mistakesList = document.querySelector("#mistakesList");
  ui.restartButton = document.querySelector("#restartQuizBtn");

  return Object.values(ui).every((node) => node !== null);
}

function sanitizeQuestions(payload) {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      question: typeof item.question === "string" ? item.question.trim() : "",
      choices: Array.isArray(item.choices) ? item.choices.filter((choice) => typeof choice === "string") : [],
      answerIndex: Number.isInteger(item.answerIndex) ? item.answerIndex : -1,
      explanation: typeof item.explanation === "string" ? item.explanation.trim() : "",
    }))
    .filter(
      (item) =>
        item.question.length > 0 &&
        item.choices.length >= 2 &&
        item.answerIndex >= 0 &&
        item.answerIndex < item.choices.length
    );
}

async function fetchQuizData() {
  const response = await fetch("./data/quiz.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Impossible de charger les questions de quiz.");
  }
  return sanitizeQuestions(await response.json());
}

function formatTime(seconds) {
  const safe = Math.max(0, seconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function updateTimerUI(seconds) {
  ui.timer.textContent = formatTime(seconds);
  ui.timer.classList.toggle("is-low", seconds <= LOW_TIME_THRESHOLD_SECONDS);
}

function clearFeedback() {
  ui.feedback.classList.add("hidden");
  ui.feedback.classList.remove("success", "error");
  ui.feedback.textContent = "";
}

function setFeedback(message, type) {
  ui.feedback.textContent = message;
  ui.feedback.classList.remove("hidden", "success", "error");
  if (type) {
    ui.feedback.classList.add(type);
  }
}

function currentQuestion() {
  return state.questions[state.currentIndex] ?? null;
}

function setScoreUI() {
  ui.score.textContent = String(state.score);
}

function createAnswerButton(choiceText, index) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "answer-card";
  button.setAttribute("role", "listitem");
  button.dataset.index = String(index);
  button.textContent = choiceText;
  return button;
}

function lockAnswerButtons() {
  ui.answers.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });
}

function renderQuestion() {
  const question = currentQuestion();

  if (!question) {
    finishQuiz();
    return;
  }

  state.answered = false;
  ui.progress.textContent = `${state.currentIndex + 1} / ${state.questions.length}`;
  ui.question.textContent = question.question;
  ui.answers.innerHTML = "";
  clearFeedback();
  ui.nextButton.classList.add("hidden");

  question.choices.forEach((choice, index) => {
    const button = createAnswerButton(choice, index);
    button.addEventListener("click", () => {
      evaluateAnswer(index);
    });
    ui.answers.appendChild(button);
  });

  state.timer.reset(QUESTION_TIME_SECONDS);
  state.timer.start();
}

function markChoices(correctIndex, selectedIndex) {
  const buttons = Array.from(ui.answers.querySelectorAll("button"));
  buttons.forEach((button, index) => {
    if (index === correctIndex) {
      button.classList.add("is-correct");
    }
    if (index === selectedIndex && selectedIndex !== correctIndex) {
      button.classList.add("is-wrong", "shake");
    }
  });
}

function buildFeedbackText(question, isCorrect, selectedIndex, timeout) {
  const selectedText = selectedIndex >= 0 ? question.choices[selectedIndex] : "Aucune réponse";
  const correctText = question.choices[question.answerIndex];

  if (isCorrect) {
    return `Bonne réponse.\n${question.explanation}`;
  }

  if (timeout) {
    return `Temps écoulé. Réponse attendue: ${correctText}.\n${question.explanation}`;
  }

  return `Réponse incorrecte: ${selectedText}. Réponse attendue: ${correctText}.\n${question.explanation}`;
}

function registerMistake(question, selectedIndex) {
  const selectedAnswer = selectedIndex >= 0 ? question.choices[selectedIndex] : "Aucune réponse";
  state.mistakes.push({
    date: new Date().toISOString(),
    question: question.question,
    correctAnswer: question.choices[question.answerIndex],
    selectedAnswer,
  });
}

function evaluateAnswer(selectedIndex, timeout = false) {
  const question = currentQuestion();
  if (!question || state.answered) {
    return;
  }

  state.answered = true;
  state.timer.stop();

  const isCorrect = selectedIndex === question.answerIndex;
  if (isCorrect) {
    state.score += 1;
  } else {
    registerMistake(question, selectedIndex);
  }

  lockAnswerButtons();
  markChoices(question.answerIndex, selectedIndex);

  const feedback = buildFeedbackText(question, isCorrect, selectedIndex, timeout);
  setFeedback(feedback, isCorrect ? "success" : "error");

  setScoreUI();
  ui.nextButton.textContent =
    state.currentIndex < state.questions.length - 1 ? "Question suivante" : "Voir le résultat";
  ui.nextButton.classList.remove("hidden");
  ui.nextButton.focus();
}

function handleTimeout() {
  evaluateAnswer(-1, true);
}

function persistQuizResult() {
  const progress = loadProgress();
  const total = state.questions.length;
  const percent = total > 0 ? Math.round((state.score / total) * 100) : 0;

  progress.quiz.sessions.push({
    date: new Date().toISOString(),
    correct: state.score,
    total,
    percent,
  });
  progress.quiz.sessions = progress.quiz.sessions.slice(-60);

  const combinedMistakes = [...state.mistakes, ...progress.quiz.mistakes];
  progress.quiz.mistakes = combinedMistakes.slice(0, 200);

  return saveProgress(progress);
}

function renderMistakesList() {
  ui.mistakesList.innerHTML = "";

  if (state.mistakes.length === 0) {
    const item = document.createElement("li");
    item.textContent = "Aucune erreur sur cette session.";
    ui.mistakesList.appendChild(item);
    return;
  }

  state.mistakes.slice(0, 8).forEach((mistake) => {
    const item = document.createElement("li");
    item.textContent = `${mistake.question} | attendu: ${mistake.correctAnswer} | choisi: ${mistake.selectedAnswer}`;
    ui.mistakesList.appendChild(item);
  });
}

function finishQuiz() {
  state.timer.stop();
  const saved = persistQuizResult();

  const total = state.questions.length;
  const percent = total > 0 ? Math.round((state.score / total) * 100) : 0;

  ui.quizView.classList.add("hidden");
  ui.finalView.classList.remove("hidden");

  ui.finalScore.textContent = `Score: ${state.score} / ${total} (${percent}%)`;
  ui.finalSummary.textContent =
    `Erreurs de session: ${state.mistakes.length}. Historique total sauvegardé: ${saved.quiz.mistakes.length}.`;

  renderMistakesList();
}

function startQuizSession() {
  state.questions = shuffleArray(state.loadedQuestions);
  state.currentIndex = 0;
  state.score = 0;
  state.answered = false;
  state.mistakes = [];

  ui.quizView.classList.remove("hidden");
  ui.finalView.classList.add("hidden");
  setScoreUI();
  clearFeedback();
  renderQuestion();
}

function bindEvents() {
  ui.nextButton.addEventListener("click", () => {
    if (!state.answered) {
      return;
    }
    state.currentIndex += 1;
    renderQuestion();
  });

  ui.restartButton.addEventListener("click", () => {
    startQuizSession();
  });
}

async function initQuizPage() {
  if (!selectElements()) {
    return;
  }

  try {
    state.loadedQuestions = await fetchQuizData();

    if (state.loadedQuestions.length === 0) {
      ui.question.textContent = "Aucune question valide n'a été trouvée dans data/quiz.json.";
      ui.answers.innerHTML = "";
      ui.nextButton.classList.add("hidden");
      return;
    }

    state.timer = new CountdownTimer(QUESTION_TIME_SECONDS, updateTimerUI, handleTimeout);

    bindEvents();
    startQuizSession();
  } catch (_error) {
    ui.question.textContent = "Le quiz n'a pas pu être chargé.";
    ui.answers.innerHTML = "";
    setFeedback("Vérifie le fichier data/quiz.json.", "error");
    ui.nextButton.classList.add("hidden");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initQuizPage, { once: true });
} else {
  initQuizPage();
}
