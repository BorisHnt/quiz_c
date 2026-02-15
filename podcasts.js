import { initCommon } from "./main.js";

const PODCAST_STATE_KEY = "c_revision_podcast_state_v1";

const ui = {
  panel: null,
  layout: null,
  list: null,
  audio: null,
  badge: null,
  title: null,
  description: null,
  playBtn: null,
  prevBtn: null,
  nextBtn: null,
  seek: null,
  current: null,
  duration: null,
  volume: null,
  speed: null,
  loopToggle: null,
  codeToggle: null,
  codePanel: null,
  codeTitle: null,
  codeContent: null,
  feedback: null,
};

const state = {
  podcasts: [],
  index: 0,
  isSeeking: false,
  resumeById: {},
  loopCurrent: false,
  showCode: false,
};

const CODE_LIBRARY = {
  ft_split: {
    title: "ft_split.c",
    code: `#include <stdlib.h>

static int is_sep(char c)
{
    if (c == ' ')
        return (1);
    if (c == '\\t')
        return (1);
    if (c == '\\n')
        return (1);
    return (0);
}

static int count_words(char *str)
{
    int count;

    count = 0;
    while (*str)
    {
        while (*str && is_sep(*str))
            str++;
        if (*str)
        {
            count++;
            while (*str && is_sep(*str) == 0)
                str++;
        }
    }
    return (count);
}

static int word_len(char *str)
{
    int len;

    len = 0;
    while (str[len] && is_sep(str[len]) == 0)
        len++;
    return (len);
}

static char *copy_word(char *src, int len)
{
    char *word;
    int i;

    word = (char *)malloc(sizeof(char) * (len + 1));
    if (word == NULL)
        return (NULL);
    i = 0;
    while (i < len)
    {
        word[i] = src[i];
        i++;
    }
    word[i] = '\\0';
    return (word);
}

static char **free_words(char **tab, int filled)
{
    int i;

    i = 0;
    while (i < filled)
    {
        free(tab[i]);
        i++;
    }
    free(tab);
    return (NULL);
}

char **ft_split(char *str)
{
    char **tab;
    int words;
    int i;
    int len;

    if (str == NULL)
        return (NULL);
    words = count_words(str);
    tab = (char **)malloc(sizeof(char *) * (words + 1));
    if (tab == NULL)
        return (NULL);
    i = 0;
    while (*str)
    {
        while (*str && is_sep(*str))
            str++;
        if (*str)
        {
            len = word_len(str);
            tab[i] = copy_word(str, len);
            if (tab[i] == NULL)
                return (free_words(tab, i));
            i++;
            str = str + len;
        }
    }
    tab[i] = NULL;
    return (tab);
}`,
  },
  itoa: {
    title: "ft_itoa.c",
    code: `#include <stdlib.h>

static int count_digits(long n)
{
    int len;

    len = 1;
    while (n >= 10)
    {
        n = n / 10;
        len++;
    }
    return (len);
}

static void fill_digits_from_right(char *str, int index, long n)
{
    while (index >= 0)
    {
        str[index] = (char)((n % 10) + '0');
        n = n / 10;
        index--;
    }
}

char *ft_itoa(int nbr)
{
    long n;
    int sign;
    int len;
    char *str;

    n = (long)nbr;
    sign = 0;
    if (n < 0)
    {
        sign = 1;
        n = -n;
    }
    len = count_digits(n) + sign;
    str = (char *)malloc(sizeof(char) * (len + 1));
    if (str == NULL)
        return (NULL);
    str[len] = '\\0';
    fill_digits_from_right(str, len - 1, n);
    if (sign == 1)
        str[0] = '-';
    return (str);
}`,
  },
  list_remove_if: {
    title: "ft_list_remove_if.c",
    code: `#include <stdlib.h>

typedef struct s_list
{
    struct s_list *next;
    void *data;
} t_list;

static void remove_head_matches(t_list **begin_list, void *data_ref,
        int (*cmp)(), void (*free_fct)(void *))
{
    t_list *tmp;

    while (*begin_list && cmp((*begin_list)->data, data_ref) == 0)
    {
        tmp = *begin_list;
        *begin_list = (*begin_list)->next;
        free_fct(tmp->data);
        free(tmp);
    }
}

void ft_list_remove_if(t_list **begin_list, void *data_ref,
        int (*cmp)(), void (*free_fct)(void *))
{
    t_list *cur;
    t_list *tmp;

    if (begin_list == NULL || cmp == NULL || free_fct == NULL)
        return ;
    remove_head_matches(begin_list, data_ref, cmp, free_fct);
    cur = *begin_list;
    while (cur && cur->next)
    {
        if (cmp(cur->next->data, data_ref) == 0)
        {
            tmp = cur->next;
            cur->next = cur->next->next;
            free_fct(tmp->data);
            free(tmp);
        }
        else
            cur = cur->next;
    }
}`,
  },
  sort_list: {
    title: "sort_list.c",
    code: `typedef struct s_list
{
    int data;
    struct s_list *next;
} t_list;

t_list *sort_list(t_list *lst, int (*cmp)(int, int))
{
    t_list *cur;
    int swapped;
    int tmp;

    if (lst == NULL || cmp == NULL)
        return (lst);
    if (lst->next == NULL)
        return (lst);
    swapped = 1;
    while (swapped == 1)
    {
        swapped = 0;
        cur = lst;
        while (cur->next)
        {
            if (cmp(cur->data, cur->next->data) > 0)
            {
                tmp = cur->data;
                cur->data = cur->next->data;
                cur->next->data = tmp;
                swapped = 1;
            }
            cur = cur->next;
        }
    }
    return (lst);
}`,
  },
  lstforeach: {
    title: "ft_list_foreach.c",
    code: `typedef struct s_list
{
    struct s_list *next;
    void *data;
} t_list;

void ft_list_foreach(t_list *begin_list, void (*f)(void *))
{
    t_list *cur;

    if (f == NULL)
        return ;
    cur = begin_list;
    while (cur)
    {
        f(cur->data);
        cur = cur->next;
    }
}`,
  },
  union: {
    title: "union.c",
    code: `#include <unistd.h>

static void init_seen(unsigned char seen[256])
{
    int i;

    i = 0;
    while (i < 256)
    {
        seen[i] = 0;
        i++;
    }
}

static void print_unique_from(char *str, unsigned char seen[256])
{
    int i;
    unsigned char c;

    i = 0;
    while (str[i])
    {
        c = (unsigned char)str[i];
        if (seen[c] == 0)
        {
            seen[c] = 1;
            write(1, &str[i], 1);
        }
        i++;
    }
}

int main(int argc, char **argv)
{
    unsigned char seen[256];

    if (argc != 3)
    {
        write(1, "\\n", 1);
        return (0);
    }
    init_seen(seen);
    print_unique_from(argv[1], seen);
    print_unique_from(argv[2], seen);
    write(1, "\\n", 1);
    return (0);
}`,
  },
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }
  const total = Math.floor(seconds);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function selectUi() {
  ui.panel = document.querySelector(".panel.podcast-panel");
  ui.layout = document.querySelector("#podcastLayout");
  ui.list = document.querySelector("#podcastList");
  ui.audio = document.querySelector("#podcastAudio");
  ui.badge = document.querySelector("#podcastBadge");
  ui.title = document.querySelector("#podcastTitle");
  ui.description = document.querySelector("#podcastDescription");
  ui.playBtn = document.querySelector("#podcastPlayBtn");
  ui.prevBtn = document.querySelector("#podcastPrevBtn");
  ui.nextBtn = document.querySelector("#podcastNextBtn");
  ui.seek = document.querySelector("#podcastSeek");
  ui.current = document.querySelector("#podcastCurrentTime");
  ui.duration = document.querySelector("#podcastDuration");
  ui.volume = document.querySelector("#podcastVolume");
  ui.speed = document.querySelector("#podcastSpeed");
  ui.loopToggle = document.querySelector("#podcastLoopToggle");
  ui.codeToggle = document.querySelector("#podcastCodeToggle");
  ui.codePanel = document.querySelector("#podcastCodePanel");
  ui.codeTitle = document.querySelector("#podcastCodeTitle");
  ui.codeContent = document.querySelector("#podcastCodeContent");
  ui.feedback = document.querySelector("#podcastFeedback");

  return Object.values(ui).every((node) => node !== null);
}

function setFeedback(message, type = "") {
  ui.feedback.textContent = message;
  ui.feedback.classList.remove("is-success", "is-error");
  if (type) {
    ui.feedback.classList.add(type);
  }
}

function normalizePodcast(item, index) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const title = typeof item.title === "string" ? item.title.trim() : "";
  const file = typeof item.file === "string" ? item.file.trim() : "";
  if (!title || !file) {
    return null;
  }

  return {
    id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `podcast-${index + 1}`,
    title,
    exercise: typeof item.exercise === "string" && item.exercise.trim() ? item.exercise.trim() : "Révision",
    description:
      typeof item.description === "string" && item.description.trim()
        ? item.description.trim()
        : "Podcast de révision.",
    file,
  };
}

function codeKeyFromPodcast(podcast) {
  const id = String(podcast.id || "").toLowerCase();
  if (id.includes("ft_split")) {
    return "ft_split";
  }
  if (id.includes("itoa")) {
    return "itoa";
  }
  if (id.includes("remove_if")) {
    return "list_remove_if";
  }
  if (id.includes("sort_list")) {
    return "sort_list";
  }
  if (id.includes("for_each") || id.includes("foreach")) {
    return "lstforeach";
  }
  if (id.includes("union")) {
    return "union";
  }
  return "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightCCode(code) {
  const blocks = [];
  let html = escapeHtml(code);

  html = html.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (match) => {
    const id = blocks.push({ cls: "tok-comment", text: match }) - 1;
    return `@@BLOCK${id}@@`;
  });

  html = html.replace(/"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g, (match) => {
    const id = blocks.push({ cls: "tok-string", text: match }) - 1;
    return `@@BLOCK${id}@@`;
  });

  html = html.replace(/^\s*#.*$/gm, (match) => {
    const id = blocks.push({ cls: "tok-preproc", text: match }) - 1;
    return `@@BLOCK${id}@@`;
  });

  html = html.replace(
    /\b(static|int|char|void|long|short|unsigned|signed|return|if|else|while|for|break|continue|typedef|struct|const|NULL|sizeof)\b/g,
    '<span class="tok-keyword">$1</span>'
  );
  html = html.replace(/\b([0-9]+)\b/g, '<span class="tok-number">$1</span>');

  html = html.replace(/@@BLOCK(\d+)@@/g, (_match, index) => {
    const block = blocks[Number(index)];
    if (!block) {
      return "";
    }
    return `<span class="${block.cls}">${block.text}</span>`;
  });

  return html;
}

function renderCodePanel() {
  const podcast = currentPodcast();
  if (!podcast || !state.showCode) {
    ui.panel.classList.remove("is-expanded");
    ui.layout.classList.add("is-code-hidden");
    ui.codePanel.classList.add("hidden");
    return;
  }

  const codeKey = codeKeyFromPodcast(podcast);
  const entry = CODE_LIBRARY[codeKey];
  ui.panel.classList.add("is-expanded");
  ui.layout.classList.remove("is-code-hidden");
  ui.codePanel.classList.remove("hidden");

  if (!entry) {
    ui.codeTitle.textContent = "Aucun code lié pour cet épisode.";
    ui.codeContent.textContent = "";
    return;
  }

  ui.codeTitle.textContent = entry.title;
  ui.codeContent.innerHTML = highlightCCode(entry.code);
}

async function loadPodcasts() {
  const response = await fetch("./data/podcasts.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Impossible de charger les podcasts.");
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map(normalizePodcast).filter(Boolean);
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(PODCAST_STATE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    state.index = Number.isFinite(parsed.index) ? Math.max(0, parsed.index) : 0;
    state.resumeById = parsed.resumeById && typeof parsed.resumeById === "object" ? parsed.resumeById : {};
    state.loopCurrent = Boolean(parsed.loopCurrent);
    state.showCode = Boolean(parsed.showCode);

    if (Number.isFinite(parsed.volume)) {
      ui.audio.volume = Math.max(0, Math.min(1, parsed.volume));
      ui.volume.value = String(ui.audio.volume);
    }

    if (Number.isFinite(parsed.playbackRate)) {
      const speed = Math.max(0.75, Math.min(2, parsed.playbackRate));
      ui.audio.playbackRate = speed;
      ui.speed.value = String(speed);
    }

    ui.codeToggle.checked = state.showCode;
    ui.loopToggle.checked = state.loopCurrent;
    ui.audio.loop = state.loopCurrent;
  } catch (_error) {
    state.index = 0;
    state.resumeById = {};
    state.loopCurrent = false;
    state.showCode = false;
    ui.loopToggle.checked = false;
    ui.codeToggle.checked = false;
    ui.audio.loop = false;
  }
}

function saveState() {
  const payload = {
    index: state.index,
    volume: ui.audio.volume,
    playbackRate: ui.audio.playbackRate,
    loopCurrent: state.loopCurrent,
    resumeById: state.resumeById,
    showCode: state.showCode,
  };
  localStorage.setItem(PODCAST_STATE_KEY, JSON.stringify(payload));
}

function currentPodcast() {
  return state.podcasts[state.index] || null;
}

function renderList() {
  ui.list.innerHTML = "";

  state.podcasts.forEach((podcast, index) => {
    const li = document.createElement("li");
    li.className = "podcast-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "podcast-item-btn";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === state.index));
    if (index === state.index) {
      button.classList.add("is-active");
    }

    const top = document.createElement("span");
    top.className = "podcast-item-top";
    top.textContent = `${podcast.exercise} · ${podcast.title}`;

    const bottom = document.createElement("span");
    bottom.className = "podcast-item-bottom";
    bottom.textContent = podcast.description;

    button.appendChild(top);
    button.appendChild(bottom);
    button.addEventListener("click", () => selectPodcast(index, true));

    li.appendChild(button);
    ui.list.appendChild(li);
  });
}

function syncMeta(podcast) {
  ui.badge.textContent = podcast.exercise;
  ui.title.textContent = podcast.title;
  ui.description.textContent = podcast.description;
}

function updateTimeUi() {
  const duration = Number.isFinite(ui.audio.duration) ? ui.audio.duration : 0;
  const current = Number.isFinite(ui.audio.currentTime) ? ui.audio.currentTime : 0;

  ui.current.textContent = formatTime(current);
  ui.duration.textContent = formatTime(duration);

  if (!state.isSeeking) {
    const pct = duration > 0 ? (current / duration) * 100 : 0;
    ui.seek.value = String(Math.max(0, Math.min(100, pct)));
  }
}

function updatePlayButton() {
  ui.playBtn.textContent = ui.audio.paused ? "Lire" : "Pause";
}

function rememberCurrentTime() {
  const podcast = currentPodcast();
  if (!podcast) {
    return;
  }
  state.resumeById[podcast.id] = Number.isFinite(ui.audio.currentTime) ? ui.audio.currentTime : 0;
}

function restoreTimeForPodcast(podcast) {
  const value = state.resumeById[podcast.id];
  if (Number.isFinite(value) && value > 0 && Number.isFinite(ui.audio.duration) && ui.audio.duration > value) {
    ui.audio.currentTime = value;
  }
}

function selectPodcast(index, autoplay = false) {
  if (!Number.isFinite(index) || index < 0 || index >= state.podcasts.length) {
    return;
  }

  rememberCurrentTime();

  state.index = index;
  const podcast = currentPodcast();
  if (!podcast) {
    return;
  }

  syncMeta(podcast);
  renderList();
  renderCodePanel();

  ui.audio.src = podcast.file;
  ui.audio.loop = state.loopCurrent;
  ui.audio.load();
  updatePlayButton();
  updateTimeUi();
  saveState();

  if (autoplay) {
    ui.audio
      .play()
      .then(() => {
        setFeedback(`Lecture: ${podcast.title}`, "is-success");
      })
      .catch(() => {
        setFeedback("Lecture bloquée par le navigateur. Clique sur Lire.", "is-error");
      });
  } else {
    setFeedback(`Prêt à lire: ${podcast.title}`);
  }
}

function playPause() {
  const podcast = currentPodcast();
  if (!podcast) {
    return;
  }

  if (ui.audio.paused) {
    ui.audio
      .play()
      .then(() => {
        setFeedback(`Lecture: ${podcast.title}`, "is-success");
      })
      .catch(() => {
        setFeedback("Impossible de lancer la lecture.", "is-error");
      });
    return;
  }

  ui.audio.pause();
  setFeedback("Lecture en pause.");
}

function bindEvents() {
  ui.playBtn.addEventListener("click", playPause);

  ui.prevBtn.addEventListener("click", () => {
    const next = (state.index - 1 + state.podcasts.length) % state.podcasts.length;
    selectPodcast(next, true);
  });

  ui.nextBtn.addEventListener("click", () => {
    const next = (state.index + 1) % state.podcasts.length;
    selectPodcast(next, true);
  });

  ui.seek.addEventListener("input", () => {
    state.isSeeking = true;
    const duration = Number.isFinite(ui.audio.duration) ? ui.audio.duration : 0;
    const pct = Number.parseFloat(ui.seek.value);
    const value = duration > 0 ? (pct / 100) * duration : 0;
    ui.current.textContent = formatTime(value);
  });

  ui.seek.addEventListener("change", () => {
    const duration = Number.isFinite(ui.audio.duration) ? ui.audio.duration : 0;
    const pct = Number.parseFloat(ui.seek.value);
    const value = duration > 0 ? (pct / 100) * duration : 0;
    ui.audio.currentTime = Math.max(0, value);
    state.isSeeking = false;
    updateTimeUi();
    saveState();
  });

  ui.volume.addEventListener("input", () => {
    const value = Number.parseFloat(ui.volume.value);
    ui.audio.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1;
    saveState();
  });

  ui.speed.addEventListener("change", () => {
    const value = Number.parseFloat(ui.speed.value);
    ui.audio.playbackRate = Number.isFinite(value) ? Math.max(0.75, Math.min(2, value)) : 1;
    saveState();
    setFeedback(`Vitesse: ${ui.audio.playbackRate}x`);
  });

  ui.loopToggle.addEventListener("change", () => {
    state.loopCurrent = ui.loopToggle.checked;
    ui.audio.loop = state.loopCurrent;
    saveState();
    setFeedback(state.loopCurrent ? "Boucle activée pour ce podcast." : "Boucle désactivée.");
  });

  ui.codeToggle.addEventListener("change", () => {
    state.showCode = ui.codeToggle.checked;
    renderCodePanel();
    saveState();
  });

  ui.audio.addEventListener("loadedmetadata", () => {
    updateTimeUi();
    const podcast = currentPodcast();
    if (podcast) {
      restoreTimeForPodcast(podcast);
      updateTimeUi();
    }
  });

  ui.audio.addEventListener("timeupdate", () => {
    updateTimeUi();
    rememberCurrentTime();
  });

  ui.audio.addEventListener("ended", () => {
    if (state.loopCurrent) {
      return;
    }
    const next = (state.index + 1) % state.podcasts.length;
    selectPodcast(next, true);
  });

  ui.audio.addEventListener("play", updatePlayButton);
  ui.audio.addEventListener("pause", () => {
    updatePlayButton();
    saveState();
  });

  ui.audio.addEventListener("error", () => {
    setFeedback("Fichier audio introuvable ou format non supporté.", "is-error");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault();
      playPause();
      return;
    }

    if (event.key === "ArrowRight") {
      const duration = Number.isFinite(ui.audio.duration) ? ui.audio.duration : 0;
      if (duration > 0) {
        ui.audio.currentTime = Math.min(duration, ui.audio.currentTime + 5);
      }
      return;
    }

    if (event.key === "ArrowLeft") {
      ui.audio.currentTime = Math.max(0, ui.audio.currentTime - 5);
    }
  });

  window.addEventListener("beforeunload", () => {
    rememberCurrentTime();
    saveState();
  });
}

async function initPodcastsPage() {
  if (!selectUi()) {
    return;
  }

  initCommon("podcasts", "podcasts.html");

  try {
    state.podcasts = await loadPodcasts();
    if (state.podcasts.length === 0) {
      setFeedback("Aucun podcast disponible.", "is-error");
      return;
    }

    loadSavedState();
    if (state.index >= state.podcasts.length) {
      state.index = 0;
    }

    renderList();
    bindEvents();
    selectPodcast(state.index, false);
  } catch (_error) {
    setFeedback("Impossible de charger la playlist podcasts.", "is-error");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPodcastsPage, { once: true });
} else {
  initPodcastsPage();
}
