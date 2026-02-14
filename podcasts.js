import { initCommon } from "./main.js";

const PODCAST_STATE_KEY = "c_revision_podcast_state_v1";

const ui = {
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
  feedback: null,
};

const state = {
  podcasts: [],
  index: 0,
  isSeeking: false,
  resumeById: {},
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

    if (Number.isFinite(parsed.volume)) {
      ui.audio.volume = Math.max(0, Math.min(1, parsed.volume));
      ui.volume.value = String(ui.audio.volume);
    }
  } catch (_error) {
    state.index = 0;
    state.resumeById = {};
  }
}

function saveState() {
  const payload = {
    index: state.index,
    volume: ui.audio.volume,
    resumeById: state.resumeById,
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

  ui.audio.src = podcast.file;
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
