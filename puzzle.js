import {
  initCommon,
  loadProgress,
  saveProgress,
  shuffleArray,
  createSeededRng,
  seedFromString,
  todayKey,
  recordPerformance,
} from "./main.js";

const PUZZLE_STORAGE_KEY = "c_revision_puzzle_state_v1";

const PUZZLES = [
  {
    id: "ft_split_words",
    title: "ft_split - Découpage de mots",
    goal: "Remettre dans l’ordre la logique principale pour extraire les mots et terminer le tableau.",
    hint: "Pense à la case NULL finale du tableau.",
    lines: [
      "int words = count_words(s, c);",
      "char **tab = malloc(sizeof(char *) * (words + 1));",
      "if (!tab) return NULL;",
      "fill_words(tab, s, c);",
      "tab[words] = NULL;",
      "return tab;",
    ],
  },
  {
    id: "ft_range_core",
    title: "ft_range - Suite inclusive",
    goal: "Reconstituer le flux qui gère start <= end et start > end sans off-by-one.",
    hint: "Le step doit être défini avant la boucle.",
    lines: [
      "int size = abs(end - start) + 1;",
      "int step = (start <= end) ? 1 : -1;",
      "int *tab = malloc(sizeof(int) * size);",
      "if (!tab) return NULL;",
      "for (int i = 0, value = start; i < size; i++, value += step)",
      "  tab[i] = value;",
      "return tab;",
    ],
  },
  {
    id: "list_remove_if",
    title: "ft_list_remove_if - Suppression sûre",
    goal: "Remettre l’ordre qui évite la corruption de liste lors d’une suppression.",
    hint: "Sauvegarder, reconnecter, puis free.",
    lines: [
      "tmp = cur->next;",
      "cur->next = cur->next->next;",
      "free_fct(tmp->data);",
      "free(tmp);",
      "if (!cur->next) break;",
      "cur = cur->next;",
    ],
  },
  {
    id: "sort_list_pass",
    title: "sort_list - Passage bubble",
    goal: "Reconstruire un passage de tri en place avec indicateur swapped.",
    hint: "Le swap se fait sur data, pas sur les liens.",
    lines: [
      "swapped = 0;",
      "cur = lst;",
      "while (cur && cur->next)",
      "{",
      "  if (cmp(cur->data, cur->next->data) > 0)",
      "  { tmp = cur->data; cur->data = cur->next->data; cur->next->data = tmp; swapped = 1; }",
      "  cur = cur->next;",
      "}",
    ],
  },
  {
    id: "itoa_safe",
    title: "itoa - Gestion signe et taille",
    goal: "Remettre les étapes clés pour une conversion robuste, y compris INT_MIN.",
    hint: "Le cast en long évite l’overflow sur INT_MIN.",
    lines: [
      "long n = nbr;",
      "int sign = (n < 0);",
      "if (n < 0) n = -n;",
      "len = count_digits(n) + sign;",
      "str = malloc(sizeof(char) * (len + 1));",
      "if (!str) return NULL;",
      "str[len] = '\\0';",
      "fill_digits_from_right(str, len - 1, n, sign);",
    ],
  },
  {
    id: "wdmatch_flow",
    title: "wdmatch - Parcours dans le bon sens",
    goal: "Retrouver le parcours qui respecte l’ordre de argv[1] dans argv[2].",
    hint: "On scanne argv[2] en avançant l’index de argv[1] seulement sur match.",
    lines: [
      "if (argc != 3) { write(1, \"\\n\", 1); return; }",
      "i = 0;",
      "j = 0;",
      "while (argv[2][j])",
      "{",
      "  if (argv[1][i] == argv[2][j]) i++;",
      "  j++;",
      "}",
      "if (argv[1][i] == '\\0') write(1, argv[1], ft_strlen(argv[1]));",
      "write(1, \"\\n\", 1);",
    ],
  },
  {
    id: "union_seen",
    title: "union - seen[256]",
    goal: "Remettre l’ordre pour afficher sans doublons sur deux chaînes.",
    hint: "Caste en unsigned char pour indexer seen.",
    lines: [
      "unsigned char seen[256] = {0};",
      "i = 0;",
      "while (argv[1][i])",
      "{",
      "  c = (unsigned char)argv[1][i++];",
      "  if (!seen[c]) { seen[c] = 1; write(1, (char *)&c, 1); }",
      "}",
      "i = 0;",
      "while (argv[2][i])",
      "{",
      "  c = (unsigned char)argv[2][i++];",
      "  if (!seen[c]) { seen[c] = 1; write(1, (char *)&c, 1); }",
      "}",
    ],
  },
  {
    id: "atoi_core",
    title: "atoi - Conversion simple",
    goal: "Replacer les étapes de conversion en respectant espaces, signe et arrêt.",
    hint: "Accumulation: result = result * 10 + chiffre.",
    lines: [
      "i = 0;",
      "while (str[i] == ' ' || (str[i] >= 9 && str[i] <= 13)) i++;",
      "sign = 1;",
      "if (str[i] == '+' || str[i] == '-') { if (str[i] == '-') sign = -1; i++; }",
      "result = 0;",
      "while (str[i] >= '0' && str[i] <= '9')",
      "{",
      "  result = result * 10 + (str[i] - '0');",
      "  i++;",
      "}",
      "return result * sign;",
    ],
  },
];

const ui = {
  puzzleSelect: null,
  loadBtn: null,
  nextBtn: null,
  shuffleBtn: null,
  verifyBtn: null,
  solutionBtn: null,
  title: null,
  goal: null,
  hint: null,
  lines: null,
  feedback: null,
  solved: null,
  attempts: null,
  streak: null,
  bestStreak: null,
  history: null,
};

const state = {
  progress: null,
  puzzleState: null,
  currentPuzzle: null,
  currentOrder: [],
  draggingLineId: "",
};

function defaultPuzzleState() {
  return {
    solvedIds: [],
    attempts: 0,
    success: 0,
    streak: 0,
    bestStreak: 0,
    history: [],
    lastPuzzleId: "",
  };
}

function loadPuzzleState() {
  try {
    const raw = localStorage.getItem(PUZZLE_STORAGE_KEY);
    if (!raw) {
      return defaultPuzzleState();
    }

    const parsed = JSON.parse(raw);
    const validIds = new Set(PUZZLES.map((p) => p.id));
    const solvedIds = Array.isArray(parsed.solvedIds)
      ? parsed.solvedIds.filter((id) => typeof id === "string" && validIds.has(id))
      : [];
    const history = Array.isArray(parsed.history)
      ? parsed.history
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            at: typeof item.at === "string" ? item.at : new Date().toISOString(),
            puzzleId: typeof item.puzzleId === "string" ? item.puzzleId : "",
            title: typeof item.title === "string" ? item.title : "",
            success: Boolean(item.success),
          }))
          .slice(0, 40)
      : [];

    return {
      solvedIds,
      attempts: Number.isFinite(parsed.attempts) ? Math.max(0, parsed.attempts) : 0,
      success: Number.isFinite(parsed.success) ? Math.max(0, parsed.success) : 0,
      streak: Number.isFinite(parsed.streak) ? Math.max(0, parsed.streak) : 0,
      bestStreak: Number.isFinite(parsed.bestStreak) ? Math.max(0, parsed.bestStreak) : 0,
      history,
      lastPuzzleId: typeof parsed.lastPuzzleId === "string" ? parsed.lastPuzzleId : "",
    };
  } catch (_error) {
    return defaultPuzzleState();
  }
}

function savePuzzleState() {
  localStorage.setItem(PUZZLE_STORAGE_KEY, JSON.stringify(state.puzzleState));
}

function selectUi() {
  ui.puzzleSelect = document.querySelector("#puzzleSelect");
  ui.loadBtn = document.querySelector("#loadPuzzleBtn");
  ui.nextBtn = document.querySelector("#nextPuzzleBtn");
  ui.shuffleBtn = document.querySelector("#shufflePuzzleBtn");
  ui.verifyBtn = document.querySelector("#verifyPuzzleBtn");
  ui.solutionBtn = document.querySelector("#showSolutionBtn");
  ui.title = document.querySelector("#puzzleTitle");
  ui.goal = document.querySelector("#puzzleGoal");
  ui.hint = document.querySelector("#puzzleHint");
  ui.lines = document.querySelector("#puzzleLines");
  ui.feedback = document.querySelector("#puzzleFeedback");
  ui.solved = document.querySelector("#puzzleSolved");
  ui.attempts = document.querySelector("#puzzleAttempts");
  ui.streak = document.querySelector("#puzzleStreak");
  ui.bestStreak = document.querySelector("#puzzleBestStreak");
  ui.history = document.querySelector("#puzzleHistoryList");

  return Object.values(ui).every((node) => node !== null);
}

function setFeedback(message, type = "") {
  ui.feedback.textContent = message;
  ui.feedback.classList.remove("is-success", "is-error");
  if (type) {
    ui.feedback.classList.add(type);
  }
}

function buildSelectOptions() {
  ui.puzzleSelect.innerHTML = "";

  const randomOption = document.createElement("option");
  randomOption.value = "random";
  randomOption.textContent = "Aléatoire";
  ui.puzzleSelect.appendChild(randomOption);

  PUZZLES.forEach((puzzle) => {
    const option = document.createElement("option");
    option.value = puzzle.id;
    option.textContent = puzzle.title;
    ui.puzzleSelect.appendChild(option);
  });

  ui.puzzleSelect.value = "random";
}

function renderStats() {
  ui.solved.textContent = String(state.puzzleState.solvedIds.length);
  ui.attempts.textContent = String(state.puzzleState.attempts);
  ui.streak.textContent = String(state.puzzleState.streak);
  ui.bestStreak.textContent = String(state.puzzleState.bestStreak);
}

function renderHistory() {
  ui.history.innerHTML = "";
  const entries = [...state.puzzleState.history].slice(0, 8);

  if (entries.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Aucune tentative puzzle pour le moment.";
    ui.history.appendChild(li);
    return;
  }

  entries.forEach((entry) => {
    const li = document.createElement("li");
    const date = new Date(entry.at).toLocaleString("fr-FR");
    li.textContent = `${entry.title} | ${entry.success ? "réussi" : "à revoir"} | ${date}`;
    ui.history.appendChild(li);
  });
}

function puzzleFromId(puzzleId) {
  return PUZZLES.find((puzzle) => puzzle.id === puzzleId) || null;
}

function pickRandomPuzzle(avoidId = "") {
  const solved = new Set(state.puzzleState.solvedIds);
  const candidates = PUZZLES.filter((puzzle) => puzzle.id !== avoidId);
  const unsolved = candidates.filter((puzzle) => !solved.has(puzzle.id));
  const pool = unsolved.length > 0 ? unsolved : candidates.length > 0 ? candidates : PUZZLES;

  const seed = seedFromString(`${todayKey()}-${Date.now()}-${state.puzzleState.attempts}-${state.puzzleState.success}`);
  const rng = createSeededRng(seed);
  const shuffled = shuffleArray(pool, rng);
  return shuffled[0];
}

function isCorrectOrder(lines) {
  return lines.every((line, index) => line.originalIndex === index);
}

function shuffleCurrentOrder() {
  if (!state.currentPuzzle) {
    return;
  }

  const seed = seedFromString(`${Date.now()}-${state.currentPuzzle.id}-${state.puzzleState.attempts}`);
  const rng = createSeededRng(seed);
  let shuffled = shuffleArray(state.currentOrder, rng);

  if (shuffled.length > 1 && isCorrectOrder(shuffled)) {
    const swap = [...shuffled];
    [swap[0], swap[1]] = [swap[1], swap[0]];
    shuffled = swap;
  }

  state.currentOrder = shuffled;
  renderLines();
  setFeedback("Lignes mélangées. Réorganise de haut en bas.");
}

function loadPuzzle(puzzle) {
  if (!puzzle) {
    return;
  }

  state.currentPuzzle = puzzle;
  state.currentOrder = puzzle.lines.map((text, index) => ({
    lineId: `${puzzle.id}-${index}`,
    originalIndex: index,
    text,
  }));
  state.puzzleState.lastPuzzleId = puzzle.id;
  savePuzzleState();

  ui.title.textContent = puzzle.title;
  ui.goal.textContent = puzzle.goal;
  ui.hint.textContent = `Indice: ${puzzle.hint}`;

  shuffleCurrentOrder();
}

function moveLine(fromIndex, toIndex) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= state.currentOrder.length ||
    toIndex >= state.currentOrder.length ||
    fromIndex === toIndex
  ) {
    return false;
  }

  const next = [...state.currentOrder];
  const [line] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, line);
  state.currentOrder = next;
  return true;
}

function renderLines() {
  ui.lines.innerHTML = "";

  state.currentOrder.forEach((line, index) => {
    const li = document.createElement("li");
    li.className = "puzzle-line";
    li.dataset.lineId = line.lineId;
    li.draggable = true;
    li.tabIndex = 0;

    const pos = document.createElement("span");
    pos.className = "puzzle-line-pos";
    pos.textContent = String(index + 1);

    const code = document.createElement("pre");
    code.className = "puzzle-code-line";
    code.textContent = line.text;

    const actions = document.createElement("div");
    actions.className = "puzzle-line-actions";

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = "line-move-btn";
    upBtn.dataset.action = "up";
    upBtn.textContent = "Monter";
    upBtn.disabled = index === 0;

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = "line-move-btn";
    downBtn.dataset.action = "down";
    downBtn.textContent = "Descendre";
    downBtn.disabled = index === state.currentOrder.length - 1;

    actions.appendChild(upBtn);
    actions.appendChild(downBtn);
    li.appendChild(pos);
    li.appendChild(code);
    li.appendChild(actions);
    ui.lines.appendChild(li);
  });
}

function currentLineIndex(lineId) {
  return state.currentOrder.findIndex((line) => line.lineId === lineId);
}

function focusLine(lineId) {
  const target = ui.lines.querySelector(`.puzzle-line[data-line-id="${lineId}"]`);
  if (target) {
    target.focus();
  }
}

function moveAndRerender(lineId, delta) {
  const from = currentLineIndex(lineId);
  const to = from + delta;
  if (!moveLine(from, to)) {
    return;
  }
  renderLines();
  focusLine(lineId);
}

function markOutcome(success) {
  state.puzzleState.attempts += 1;
  if (success) {
    state.puzzleState.success += 1;
    state.puzzleState.streak += 1;
    state.puzzleState.bestStreak = Math.max(state.puzzleState.bestStreak, state.puzzleState.streak);
    if (!state.puzzleState.solvedIds.includes(state.currentPuzzle.id)) {
      state.puzzleState.solvedIds.push(state.currentPuzzle.id);
    }
  } else {
    state.puzzleState.streak = 0;
  }

  state.puzzleState.history.unshift({
    at: new Date().toISOString(),
    puzzleId: state.currentPuzzle.id,
    title: state.currentPuzzle.title,
    success,
  });
  state.puzzleState.history = state.puzzleState.history.slice(0, 40);
  savePuzzleState();

  const progress = loadProgress();
  recordPerformance(progress, success);
  state.progress = saveProgress(progress);
}

function checkPuzzle() {
  if (!state.currentPuzzle) {
    return;
  }

  const success = isCorrectOrder(state.currentOrder);
  markOutcome(success);
  renderStats();
  renderHistory();

  if (success) {
    setFeedback("Correct. Le flux de code est cohérent.", "is-success");
    return;
  }

  const wrongIndex = state.currentOrder.findIndex((line, idx) => line.originalIndex !== idx);
  setFeedback(
    `Pas encore. Commence par vérifier la ligne ${wrongIndex + 1} et les dépendances autour de malloc/free.`,
    "is-error"
  );
}

function showSolution() {
  if (!state.currentPuzzle) {
    return;
  }

  state.currentOrder = state.currentPuzzle.lines.map((text, index) => ({
    lineId: `${state.currentPuzzle.id}-${index}`,
    originalIndex: index,
    text,
  }));
  renderLines();
  setFeedback("Solution affichée. Relance un puzzle pour t'entraîner en conditions réelles.");
}

function loadSelectedPuzzle(avoidCurrent = false) {
  const selected = ui.puzzleSelect.value;

  if (selected === "random") {
    const puzzle = pickRandomPuzzle(avoidCurrent && state.currentPuzzle ? state.currentPuzzle.id : "");
    loadPuzzle(puzzle);
    return;
  }

  if (avoidCurrent && state.currentPuzzle && selected === state.currentPuzzle.id) {
    const currentIndex = PUZZLES.findIndex((p) => p.id === selected);
    const nextIndex = (currentIndex + 1) % PUZZLES.length;
    const nextPuzzle = PUZZLES[nextIndex];
    ui.puzzleSelect.value = nextPuzzle.id;
    loadPuzzle(nextPuzzle);
    return;
  }

  const puzzle = puzzleFromId(selected);
  loadPuzzle(puzzle || pickRandomPuzzle());
}

function clearDropTargets() {
  ui.lines.querySelectorAll(".puzzle-line").forEach((line) => {
    line.classList.remove("is-drop-target");
    line.classList.remove("is-dragging");
  });
}

function bindLineEvents() {
  ui.lines.addEventListener("click", (event) => {
    const button = event.target.closest(".line-move-btn");
    if (!button) {
      return;
    }

    const line = event.target.closest(".puzzle-line");
    if (!line) {
      return;
    }

    const action = button.dataset.action;
    if (action === "up") {
      moveAndRerender(line.dataset.lineId, -1);
      return;
    }
    if (action === "down") {
      moveAndRerender(line.dataset.lineId, 1);
    }
  });

  ui.lines.addEventListener("keydown", (event) => {
    const line = event.target.closest(".puzzle-line");
    if (!line) {
      return;
    }

    if (!event.altKey) {
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveAndRerender(line.dataset.lineId, -1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveAndRerender(line.dataset.lineId, 1);
    }
  });

  ui.lines.addEventListener("dragstart", (event) => {
    const line = event.target.closest(".puzzle-line");
    if (!line) {
      return;
    }

    state.draggingLineId = line.dataset.lineId;
    line.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.draggingLineId);
  });

  ui.lines.addEventListener("dragover", (event) => {
    const line = event.target.closest(".puzzle-line");
    if (!line) {
      return;
    }
    event.preventDefault();
    clearDropTargets();
    line.classList.add("is-drop-target");
    event.dataTransfer.dropEffect = "move";
  });

  ui.lines.addEventListener("dragleave", (event) => {
    const line = event.target.closest(".puzzle-line");
    if (!line) {
      return;
    }
    line.classList.remove("is-drop-target");
  });

  ui.lines.addEventListener("drop", (event) => {
    event.preventDefault();
    const target = event.target.closest(".puzzle-line");
    if (!target) {
      return;
    }

    const draggedId = state.draggingLineId || event.dataTransfer.getData("text/plain");
    const from = currentLineIndex(draggedId);
    const to = currentLineIndex(target.dataset.lineId);

    clearDropTargets();
    if (!moveLine(from, to)) {
      return;
    }
    renderLines();
    focusLine(draggedId);
  });

  ui.lines.addEventListener("dragend", () => {
    state.draggingLineId = "";
    clearDropTargets();
  });
}

function bindEvents() {
  ui.loadBtn.addEventListener("click", () => loadSelectedPuzzle(false));
  ui.nextBtn.addEventListener("click", () => loadSelectedPuzzle(true));
  ui.shuffleBtn.addEventListener("click", shuffleCurrentOrder);
  ui.verifyBtn.addEventListener("click", checkPuzzle);
  ui.solutionBtn.addEventListener("click", showSolution);
  bindLineEvents();
}

function initPuzzlePage() {
  if (!selectUi()) {
    return;
  }

  state.progress = initCommon("puzzle", "puzzle.html");
  state.puzzleState = loadPuzzleState();
  buildSelectOptions();
  renderStats();
  renderHistory();
  bindEvents();

  const initialPuzzle = puzzleFromId(state.puzzleState.lastPuzzleId) || pickRandomPuzzle();
  if (initialPuzzle) {
    ui.puzzleSelect.value = initialPuzzle.id;
    loadPuzzle(initialPuzzle);
  }

  setFeedback("Réordonne les lignes pour reconstruire le code.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPuzzlePage, { once: true });
} else {
  initPuzzlePage();
}
