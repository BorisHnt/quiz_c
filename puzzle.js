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
    goal: "Remettre dans l’ordre un flux ft_split complet: séparateurs, copie des mots, gestion d’erreur et terminaison.",
    hint: "Pense à l’ordre: skip séparateurs, copier, gérer l’échec, puis NULL final.",
    lines: [
      "words = count_words(s, c);",
      "tab = (char **)malloc(sizeof(char *) * (words + 1));",
      "if (tab == NULL)",
      "    return (NULL);",
      "i = 0;",
      "while (*s)",
      "{",
      "    while (*s == c)",
      "        s++;",
      "    if (*s)",
      "    {",
      "        len = word_len(s, c);",
      "        tab[i] = copy_word(s, len);",
      "        if (tab[i] == NULL)",
      "            return (free_words(tab, i));",
      "        i++;",
      "        s = s + len;",
      "    }",
      "}",
      "tab[i] = NULL;",
      "return (tab);",
    ],
  },
  {
    id: "ft_range_core",
    title: "ft_range - Suite inclusive",
    goal: "Reconstituer le flux qui gère start <= end et start > end sans off-by-one.",
    hint: "Le step doit être défini avant la boucle.",
    lines: [
      "size = ft_abs(end - start) + 1;",
      "step = 1;",
      "if (start > end)",
      "    step = -1;",
      "tab = (int *)malloc(sizeof(int) * size);",
      "if (tab == NULL)",
      "    return (NULL);",
      "i = 0;",
      "value = start;",
      "while (i < size)",
      "{",
      "    tab[i] = value;",
      "    value = value + step;",
      "    i++;",
      "}",
      "return (tab);",
    ],
  },
  {
    id: "list_remove_if",
    title: "ft_list_remove_if - Suppression sûre",
    goal: "Remettre l’ordre qui évite la corruption de liste lors d’une suppression.",
    hint: "Sauvegarder, reconnecter, puis free.",
    lines: [
      "while (*begin_list && cmp((*begin_list)->data, data_ref) == 0)",
      "{",
      "    tmp = *begin_list;",
      "    *begin_list = (*begin_list)->next;",
      "    free_fct(tmp->data);",
      "    free(tmp);",
      "}",
      "cur = *begin_list;",
      "while (cur && cur->next)",
      "{",
      "    if (cmp(cur->next->data, data_ref) == 0)",
      "    {",
      "        tmp = cur->next;",
      "        cur->next = cur->next->next;",
      "        free_fct(tmp->data);",
      "        free(tmp);",
      "    }",
      "    else",
      "        cur = cur->next;",
      "}",
    ],
  },
  {
    id: "sort_list_pass",
    title: "sort_list - Passage bubble",
    goal: "Reconstruire un passage de tri en place avec indicateur swapped.",
    hint: "Le swap se fait sur data, pas sur les liens.",
    lines: [
      "if (!lst || !lst->next)",
      "    return (lst);",
      "swapped = 1;",
      "while (swapped)",
      "{",
      "    swapped = 0;",
      "    cur = lst;",
      "    while (cur->next)",
      "    {",
      "        if (cmp(cur->data, cur->next->data) > 0)",
      "        {",
      "            tmp = cur->data;",
      "            cur->data = cur->next->data;",
      "            cur->next->data = tmp;",
      "            swapped = 1;",
      "        }",
      "        cur = cur->next;",
      "    }",
      "}",
      "return (lst);",
    ],
  },
  {
    id: "itoa_safe",
    title: "itoa - Gestion signe et taille",
    goal: "Remettre les étapes clés pour une conversion robuste, y compris INT_MIN.",
    hint: "Le cast en long évite l’overflow sur INT_MIN.",
    lines: [
      "n = (long)nbr;",
      "sign = 0;",
      "if (n < 0)",
      "{",
      "    sign = 1;",
      "    n = -n;",
      "}",
      "len = count_digits(n) + sign;",
      "str = (char *)malloc(sizeof(char) * (len + 1));",
      "if (str == NULL)",
      "    return (NULL);",
      "str[len] = '\\0';",
      "fill_digits_from_right(str, len - 1, n);",
      "if (sign == 1)",
      "    str[0] = '-';",
      "return (str);",
    ],
  },
  {
    id: "wdmatch_flow",
    title: "wdmatch - Parcours dans le bon sens",
    goal: "Retrouver le parcours qui respecte l’ordre de argv[1] dans argv[2].",
    hint: "On scanne argv[2] en avançant l’index de argv[1] seulement sur match.",
    lines: [
      "if (argc != 3)",
      "{",
      "    write(1, \"\\n\", 1);",
      "    return ;",
      "}",
      "i = 0;",
      "j = 0;",
      "while (argv[2][j])",
      "{",
      "    if (argv[1][i] == argv[2][j])",
      "        i++;",
      "    j++;",
      "}",
      "if (argv[1][i] == '\\0')",
      "    write(1, argv[1], ft_strlen(argv[1]));",
      "write(1, \"\\n\", 1);",
    ],
  },
  {
    id: "union_seen",
    title: "union - seen[256]",
    goal: "Remettre l’ordre pour afficher sans doublons sur deux chaînes.",
    hint: "Caste en unsigned char pour indexer seen.",
    lines: [
      "i = 0;",
      "while (i < 256)",
      "{",
      "    seen[i] = 0;",
      "    i++;",
      "}",
      "i = 0;",
      "while (argv[1][i])",
      "{",
      "    c = (unsigned char)argv[1][i];",
      "    if (seen[c] == 0)",
      "    {",
      "        seen[c] = 1;",
      "        write(1, (char *)&argv[1][i], 1);",
      "    }",
      "    i++;",
      "}",
      "i = 0;",
      "while (argv[2][i])",
      "{",
      "    c = (unsigned char)argv[2][i];",
      "    if (seen[c] == 0)",
      "    {",
      "        seen[c] = 1;",
      "        write(1, (char *)&argv[2][i], 1);",
      "    }",
      "    i++;",
      "}",
      "write(1, \"\\n\", 1);",
    ],
  },
  {
    id: "atoi_core",
    title: "atoi - Conversion simple",
    goal: "Replacer les étapes de conversion en respectant espaces, signe et arrêt.",
    hint: "Accumulation: result = result * 10 + chiffre.",
    lines: [
      "i = 0;",
      "while (str[i] == ' ' || (str[i] >= 9 && str[i] <= 13))",
      "    i++;",
      "sign = 1;",
      "if (str[i] == '-')",
      "{",
      "    sign = -1;",
      "    i++;",
      "}",
      "else if (str[i] == '+')",
      "    i++;",
      "result = 0;",
      "while (str[i] >= '0' && str[i] <= '9')",
      "{",
      "    result = result * 10;",
      "    result = result + (str[i] - '0');",
      "    i++;",
      "}",
      "return result * sign;",
    ],
  },
];

const ui = {
  puzzleSelect: null,
  levelSelect: null,
  loadBtn: null,
  nextBtn: null,
  shuffleBtn: null,
  verifyBtn: null,
  solutionBtn: null,
  title: null,
  goal: null,
  hint: null,
  levelBadge: null,
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
  currentLevel: 1,
  currentPartCount: 0,
  draggingLineId: "",
};

function clampLevel(value) {
  const level = Number.parseInt(String(value), 10);
  if (!Number.isFinite(level)) {
    return 1;
  }
  return Math.max(1, Math.min(4, level));
}

function defaultPuzzleState() {
  return {
    solvedIds: [],
    attempts: 0,
    success: 0,
    streak: 0,
    bestStreak: 0,
    history: [],
    lastPuzzleId: "",
    lastLevel: 1,
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
      lastLevel: clampLevel(parsed.lastLevel),
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
  ui.levelSelect = document.querySelector("#puzzleLevelSelect");
  ui.loadBtn = document.querySelector("#loadPuzzleBtn");
  ui.nextBtn = document.querySelector("#nextPuzzleBtn");
  ui.shuffleBtn = document.querySelector("#shufflePuzzleBtn");
  ui.verifyBtn = document.querySelector("#verifyPuzzleBtn");
  ui.solutionBtn = document.querySelector("#showSolutionBtn");
  ui.title = document.querySelector("#puzzleTitle");
  ui.goal = document.querySelector("#puzzleGoal");
  ui.hint = document.querySelector("#puzzleHint");
  ui.levelBadge = document.querySelector("#puzzleLevelBadge");
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

function selectedLevel() {
  return clampLevel(ui.levelSelect.value);
}

function partTargets(totalLines) {
  const maxParts = Math.max(1, totalLines);
  const clampParts = (value) => Math.max(1, Math.min(maxParts, value));
  const level1 = clampParts(Math.max(2, Math.floor(totalLines * 0.45)));
  const level2 = clampParts(Math.max(level1 + 1, Math.floor(totalLines * 0.65)));
  const level3 = clampParts(Math.max(level2 + 1, Math.floor(totalLines * 0.85)));
  return {
    1: level1,
    2: level2,
    3: level3,
    4: maxParts,
  };
}

function splitLinesIntoParts(lines, wantedParts) {
  const safeParts = Math.max(1, Math.min(wantedParts, lines.length));
  const groups = [];
  let cursor = 0;
  const baseSize = Math.floor(lines.length / safeParts);
  let remainder = lines.length % safeParts;

  for (let i = 0; i < safeParts; i += 1) {
    const size = baseSize + (remainder > 0 ? 1 : 0);
    remainder = Math.max(0, remainder - 1);
    groups.push(lines.slice(cursor, cursor + size));
    cursor += size;
  }

  return groups;
}

function buildChunksForLevel(puzzle, level) {
  const targets = partTargets(puzzle.lines.length);
  const partCount = targets[level] || puzzle.lines.length;
  const groups = splitLinesIntoParts(puzzle.lines, partCount);
  return groups.map((group, index) => ({
    lineId: `${puzzle.id}-l${level}-${index}`,
    originalIndex: index,
    text: group.join("\n"),
  }));
}

function renderLevelBadge() {
  if (!state.currentPuzzle) {
    ui.levelBadge.textContent = "Niveau -";
    return;
  }
  ui.levelBadge.textContent = `Niveau ${state.currentLevel} | ${state.currentPartCount} blocs`;
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

  const seed = seedFromString(
    `${Date.now()}-${state.currentPuzzle.id}-l${state.currentLevel}-${state.puzzleState.attempts}`
  );
  const rng = createSeededRng(seed);
  let shuffled = shuffleArray(state.currentOrder, rng);

  if (shuffled.length > 1 && isCorrectOrder(shuffled)) {
    const swap = [...shuffled];
    [swap[0], swap[1]] = [swap[1], swap[0]];
    shuffled = swap;
  }

  state.currentOrder = shuffled;
  renderLines();
  setFeedback(`Niveau ${state.currentLevel}: ${state.currentPartCount} blocs mélangés. Réorganise de haut en bas.`);
}

function loadPuzzle(puzzle) {
  if (!puzzle) {
    return;
  }

  const level = selectedLevel();
  state.currentPuzzle = puzzle;
  state.currentLevel = level;
  state.currentOrder = buildChunksForLevel(puzzle, level);
  state.currentPartCount = state.currentOrder.length;
  state.puzzleState.lastPuzzleId = puzzle.id;
  state.puzzleState.lastLevel = level;
  savePuzzleState();

  ui.title.textContent = puzzle.title;
  ui.goal.textContent = puzzle.goal;
  ui.hint.textContent = `Indice: ${puzzle.hint}`;
  renderLevelBadge();

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
    setFeedback(
      `Correct. Niveau ${state.currentLevel} validé avec ${state.currentPartCount} blocs dans le bon ordre.`,
      "is-success"
    );
    return;
  }

  const wrongIndex = state.currentOrder.findIndex((line, idx) => line.originalIndex !== idx);
  setFeedback(
    `Pas encore. Niveau ${state.currentLevel}: vérifie d'abord le bloc ${wrongIndex + 1}.`,
    "is-error"
  );
}

function showSolution() {
  if (!state.currentPuzzle) {
    return;
  }

  state.currentOrder = buildChunksForLevel(state.currentPuzzle, state.currentLevel);
  state.currentPartCount = state.currentOrder.length;
  renderLines();
  renderLevelBadge();
  setFeedback(`Solution affichée pour le niveau ${state.currentLevel}. Relance un puzzle pour t'entraîner.`);
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
  ui.levelSelect.addEventListener("change", () => {
    const level = selectedLevel();
    state.puzzleState.lastLevel = level;
    savePuzzleState();
    if (state.currentPuzzle) {
      loadPuzzle(state.currentPuzzle);
    }
  });
  bindLineEvents();
}

function initPuzzlePage() {
  if (!selectUi()) {
    return;
  }

  state.progress = initCommon("puzzle", "puzzle.html");
  state.puzzleState = loadPuzzleState();
  state.currentLevel = clampLevel(state.puzzleState.lastLevel);
  buildSelectOptions();
  ui.levelSelect.value = String(state.currentLevel);
  renderStats();
  renderHistory();
  renderLevelBadge();
  bindEvents();

  const initialPuzzle = puzzleFromId(state.puzzleState.lastPuzzleId) || pickRandomPuzzle();
  if (initialPuzzle) {
    ui.puzzleSelect.value = initialPuzzle.id;
    loadPuzzle(initialPuzzle);
  }

  setFeedback(`Niveau ${state.currentLevel}: réordonne les lignes pour reconstruire le code.`);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPuzzlePage, { once: true });
} else {
  initPuzzlePage();
}
