const FOUR_LETTER_WORDS = [
  "able",
  "bake",
  "beam",
  "bird",
  "bold",
  "cake",
  "calm",
  "card",
  "clay",
  "code",
  "cold",
  "dawn",
  "dear",
  "dice",
  "door",
  "dove",
  "fire",
  "fish",
  "flow",
  "game",
  "glow",
  "gold",
  "grow",
  "hand",
  "hope",
  "jump",
  "kind",
  "lake",
  "leaf",
  "lime",
  "lion",
  "love",
  "maze",
  "milk",
  "mind",
  "moon",
  "nest",
  "note",
  "open",
  "park",
  "path",
  "play",
  "rain",
  "read",
  "ring",
  "road",
  "rock",
  "rose",
  "sand",
  "ship",
  "snow",
  "song",
  "star",
  "time",
  "tree",
  "wave",
  "wind",
  "wolf",
  "wood",
];

const FIVE_LETTER_WORDS = [
  "about",
  "actor",
  "adore",
  "alarm",
  "angle",
  "apple",
  "baker",
  "beach",
  "beard",
  "blend",
  "brave",
  "brick",
  "bring",
  "cabin",
  "cable",
  "candy",
  "chair",
  "charm",
  "chase",
  "clean",
  "climb",
  "cloud",
  "crane",
  "dance",
  "dream",
  "drink",
  "earth",
  "eager",
  "elite",
  "faith",
  "field",
  "flame",
  "flint",
  "focus",
  "frame",
  "fresh",
  "giant",
  "glide",
  "grace",
  "grain",
  "grand",
  "grape",
  "green",
  "heart",
  "honey",
  "house",
  "ivory",
  "jelly",
  "knife",
  "laser",
  "lemon",
  "light",
  "linen",
  "lunar",
  "magic",
  "mango",
  "march",
  "metal",
  "night",
  "noble",
  "ocean",
  "olive",
  "orbit",
  "party",
  "pearl",
  "piano",
  "plant",
  "pride",
  "quiet",
  "radio",
  "raven",
  "river",
  "roast",
  "royal",
  "scale",
  "shine",
  "slate",
  "smile",
  "solid",
  "spark",
  "spice",
  "stone",
  "storm",
  "table",
  "tiger",
  "trace",
  "train",
  "unity",
  "vapor",
  "vivid",
  "water",
  "wheat",
  "world",
  "yacht",
  "zesty",
];

const DIFFICULTIES = {
  easy: {
    label: "Easy",
    size: 4,
    words: FOUR_LETTER_WORDS,
    startingExtraTiles: 2,
  },
  hard: {
    label: "Hard",
    size: 5,
    words: FIVE_LETTER_WORDS,
    startingExtraTiles: 4,
  },
};
const MAX_UNDOS = 3;
const MAX_DELETES = 1;
const SLIDE_MS = 240;
const MERGE_MS = 170;
const SUPABASE_URL = "https://lmostoozyunntsrlaizb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2WnsbnGUjQB3P5hDXAZPlg_Wkg349-q";
const REACTION_KEYS = ["fire", "brain", "tough", "fun"];
const REACTION_STORAGE_KEY = "anagram-2048-reaction";

const boardElement = document.querySelector("#board");
const scoreElement = document.querySelector("#score");
const movesElement = document.querySelector("#moves");
const undoButtonElement = document.querySelector("#undoMove");
const undoCountElement = document.querySelector("#undoCount");
const deleteButtonElement = document.querySelector("#deleteTile");
const deleteCountElement = document.querySelector("#deleteCount");
const soundToggleElement = document.querySelector("#soundToggle");
const soundLabelElement = document.querySelector("#soundLabel");
const quitButtonElements = document.querySelectorAll("[data-quit-game]");
const quitModalElement = document.querySelector("#quitModal");
const quitTitleElement = document.querySelector("#quitTitle");
const quitTextElement = document.querySelector("#quitText");
const cancelQuitElement = document.querySelector("#cancelQuit");
const modeButtonElements = document.querySelectorAll(".mode-button");
const bannerElement = document.querySelector("#banner");
const bannerTitleElement = document.querySelector("#bannerTitle");
const bannerTextElement = document.querySelector("#bannerText");
const playAgainElement = document.querySelector("#playAgain");
const reactionButtonElements = Array.from(document.querySelectorAll("[data-reaction]"));
const reactionStatusElement = document.querySelector("#reactionStatus");

let state;
let nextTileId = 1;
let tileLayerElement;
let burstLayerElement;
let tileElements = new Map();
let audioContext;
let soundEnabled = true;
let currentDifficulty = "easy";
let reactionSaving = false;

function createGame(difficulty = currentDifficulty) {
  const config = DIFFICULTIES[difficulty] ?? DIFFICULTIES.easy;
  const target = config.words[Math.floor(Math.random() * config.words.length)];
  currentDifficulty = difficulty;
  nextTileId = 1;
  tileElements = new Map();
  setupBoardShell();

  state = {
    difficulty,
    size: config.size,
    target,
    board: Array.from({ length: getBoardCellCount(config.size) }, () => null),
    score: 0,
    moves: 0,
    history: [],
    undosLeft: MAX_UNDOS,
    deletesLeft: MAX_DELETES,
    selectedTileId: null,
    over: false,
    won: false,
    animating: false,
  };

  seedTargetLetters(target);
  for (let count = 0; count < config.startingExtraTiles; count += 1) addTile(randomWordLetter(), "extra");

  bannerElement.classList.add("hidden");
  render();
}

function seedTargetLetters(target) {
  target.split("").forEach((letter, order) => {
    addTile(letter, "target", { order });
  });

  if (checkWin()) {
    state.board = shuffleArray(state.board);
  }
}

function addTile(text = randomWordLetter(), kind = "extra", extra = {}) {
  const emptyIndexes = state.board
    .map((tile, index) => (tile ? null : index))
    .filter((index) => index !== null);

  if (!emptyIndexes.length) return false;

  const index = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
  const tile = {
    id: nextTileId,
    text,
    kind,
    ...extra,
  };
  state.board[index] = tile;
  nextTileId += 1;
  return { tile, index };
}

function randomWordLetter() {
  return state.target[Math.floor(Math.random() * state.target.length)];
}

function render() {
  syncTiles();
  renderHud();
}

function setupBoardShell() {
  const size = getBoardSize();
  boardElement.innerHTML = "";
  boardElement.style.setProperty("--size", size);
  boardElement.style.setProperty("--tracks", size - 1);

  for (let index = 0; index < getBoardCellCount(); index += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    boardElement.append(cell);
  }

  tileLayerElement = document.createElement("div");
  tileLayerElement.className = "tile-layer";
  boardElement.append(tileLayerElement);

  burstLayerElement = document.createElement("div");
  burstLayerElement.className = "burst-layer";
  boardElement.append(burstLayerElement);
}

function renderHud() {
  scoreElement.textContent = state.score.toLocaleString();
  movesElement.textContent = state.moves.toString();
  undoCountElement.textContent = state.undosLeft.toString();
  deleteCountElement.textContent = state.deletesLeft.toString();
  undoButtonElement.disabled = state.undosLeft <= 0 || state.history.length === 0 || state.animating;
  deleteButtonElement.disabled = !canDeleteSelectedTile();
}

function getAudioContext() {
  if (!soundEnabled) return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;

  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

function playTone({ frequency, endFrequency = frequency, duration = 0.12, type = "sine", volume = 0.06, delay = 0 }) {
  const context = getAudioContext();
  if (!context) return;

  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playSound(name) {
  if (!soundEnabled) return;

  const sounds = {
    slide: () => playTone({ frequency: 190, endFrequency: 245, duration: 0.09, type: "triangle", volume: 0.035 }),
    blocked: () => playTone({ frequency: 120, endFrequency: 82, duration: 0.11, type: "sawtooth", volume: 0.025 }),
    merge: () => {
      playTone({ frequency: 330, endFrequency: 440, duration: 0.11, type: "triangle", volume: 0.045 });
      playTone({ frequency: 660, endFrequency: 880, duration: 0.12, type: "sine", volume: 0.03, delay: 0.04 });
    },
    spawn: () => playTone({ frequency: 740, endFrequency: 520, duration: 0.13, type: "sine", volume: 0.035 }),
    delete: () => playTone({ frequency: 260, endFrequency: 150, duration: 0.12, type: "triangle", volume: 0.032 }),
    win: () => {
      [523, 659, 784, 1046].forEach((frequency, index) => {
        playTone({ frequency, endFrequency: frequency * 1.02, duration: 0.16, type: "sine", volume: 0.04, delay: index * 0.075 });
      });
    },
  };

  sounds[name]?.();
}

function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  soundLabelElement.textContent = enabled ? "Sound On" : "Sound Off";
  soundToggleElement.setAttribute("aria-label", enabled ? "Turn sound off" : "Turn sound on");
  soundToggleElement.setAttribute("aria-pressed", String(enabled));
}

function getSupabaseHeaders(hasBody = false) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
  };
}

function getStoredReaction() {
  try {
    return window.localStorage.getItem(REACTION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredReaction(reaction) {
  try {
    window.localStorage.setItem(REACTION_STORAGE_KEY, reaction);
  } catch {
    // Votes still sync; this only prevents repeat voting in the same browser.
  }
}

function clearStoredReaction() {
  try {
    window.localStorage.removeItem(REACTION_STORAGE_KEY);
  } catch {
    // If storage is unavailable, the shared count still updates.
  }
}

function setReactionStatus(text) {
  reactionStatusElement.textContent = text;
}

async function getErrorMessage(response) {
  try {
    const error = await response.json();
    return error?.code === "PGRST202" ? "Run Supabase setup SQL." : error?.message ?? "Reaction sync failed.";
  } catch {
    return "Reaction sync failed.";
  }
}

function updateReactionButtons(counts = new Map()) {
  const storedReaction = getStoredReaction();

  reactionButtonElements.forEach((button) => {
    const reaction = button.dataset.reaction;
    const count = counts.has(reaction) ? counts.get(reaction) : Number(button.dataset.count ?? 0);
    const countElement = button.querySelector("[data-count]");

    button.dataset.count = String(count);
    countElement.textContent = count.toLocaleString();
    button.classList.toggle("voted", storedReaction === reaction);
    button.disabled = reactionSaving || (Boolean(storedReaction) && storedReaction !== reaction);
  });
}

async function loadReactions() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/reactions?select=emoji,count`, {
      headers: getSupabaseHeaders(),
    });

    if (!response.ok) throw new Error("Reaction counts are not ready yet.");

    const rows = await response.json();
    const counts = new Map(rows.map((row) => [row.emoji, Number(row.count) || 0]));
    REACTION_KEYS.forEach((reaction) => {
      if (!counts.has(reaction)) counts.set(reaction, 0);
    });

    updateReactionButtons(counts);
    setReactionStatus("");
  } catch {
    updateReactionButtons();
    setReactionStatus("Run Supabase setup SQL.");
  }
}

async function submitReaction(reaction) {
  if (reactionSaving || !REACTION_KEYS.includes(reaction) || getStoredReaction()) return;

  const button = reactionButtonElements.find((item) => item.dataset.reaction === reaction);
  if (!button) return;

  const previousCount = Number(button.dataset.count ?? 0);
  reactionSaving = true;
  updateReactionButtons(new Map([[reaction, previousCount + 1]]));
  setReactionStatus("Saving reaction...");

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_reaction`, {
      method: "POST",
      headers: getSupabaseHeaders(true),
      body: JSON.stringify({ reaction_key: reaction }),
    });

    if (!response.ok) throw new Error(await getErrorMessage(response));

    const rows = await response.json();
    const saved = Array.isArray(rows) ? rows[0] : rows;
    if (saved?.emoji) {
      updateReactionButtons(new Map([[saved.emoji, Number(saved.count) || previousCount + 1]]));
    }

    setStoredReaction(reaction);
    reactionSaving = false;
    updateReactionButtons();
    setReactionStatus("Saved.");
  } catch (error) {
    reactionSaving = false;
    updateReactionButtons(new Map([[reaction, previousCount]]));
    setReactionStatus(error.message);
  }
}

async function removeReaction(reaction) {
  if (reactionSaving || getStoredReaction() !== reaction) return;

  const button = reactionButtonElements.find((item) => item.dataset.reaction === reaction);
  if (!button) return;

  const previousCount = Number(button.dataset.count ?? 0);
  const nextCount = Math.max(0, previousCount - 1);
  reactionSaving = true;
  updateReactionButtons(new Map([[reaction, nextCount]]));
  setReactionStatus("Removing reaction...");

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/decrement_reaction`, {
      method: "POST",
      headers: getSupabaseHeaders(true),
      body: JSON.stringify({ reaction_key: reaction }),
    });

    if (!response.ok) throw new Error(await getErrorMessage(response));

    const saved = await response.json();
    if (saved?.emoji) {
      updateReactionButtons(new Map([[saved.emoji, Number(saved.count) || 0]]));
    }

    clearStoredReaction();
    reactionSaving = false;
    updateReactionButtons();
    setReactionStatus("Removed.");
  } catch (error) {
    reactionSaving = false;
    updateReactionButtons(new Map([[reaction, previousCount]]));
    setReactionStatus(error.message);
  }
}

function toggleReaction(reaction) {
  if (getStoredReaction() === reaction) {
    removeReaction(reaction);
    return;
  }

  submitReaction(reaction);
}

function syncTiles(newTileIds = new Set()) {
  normalizeSelection();
  const desiredIds = new Set(state.board.filter(Boolean).map((tile) => tile.id));
  const statusById = getTileStatuses();

  tileElements.forEach((tileElement, id) => {
    if (!desiredIds.has(id)) {
      tileElement.remove();
      tileElements.delete(id);
    }
  });

  state.board.forEach((tile, index) => {
    if (!tile) return;

    let tileElement = tileElements.get(tile.id);
    if (!tileElement) {
      tileElement = createTileElement(tile);
      if (!newTileIds.has(tile.id)) {
        tileElement.classList.add("no-transition");
        requestAnimationFrame(() => tileElement.classList.remove("no-transition"));
      }
      tileLayerElement.append(tileElement);
      tileElements.set(tile.id, tileElement);
    }

    updateTileContent(tileElement, tile, statusById.get(tile.id));
    tileElement.classList.toggle("selected", tile.id === state.selectedTileId);
    setTilePosition(tileElement, index);
  });
}

function createTileElement(tile) {
  const tileElement = document.createElement("div");
  tileElement.className = "tile";
  tileElement.dataset.id = tile.id;
  updateTileContent(tileElement, tile, "clutter");
  return tileElement;
}

function updateTileContent(tileElement, tile, status = "clutter") {
  tileElement.dataset.kind = tile.kind;
  tileElement.dataset.status = status;
  tileElement.textContent = tile.text;
}

function setTilePosition(tileElement, index) {
  const size = getBoardSize();
  const row = Math.floor(index / size);
  const col = index % size;
  tileElement.style.left = `calc(${col} * ((100% + var(--board-gap)) / ${size}))`;
  tileElement.style.top = `calc(${row} * ((100% + var(--board-gap)) / ${size}))`;
}

function getTileStatuses() {
  const statuses = new Map();
  const remaining = getTargetLetterCounts();
  const linked = getLinkedTargetIds(remaining);

  state.board.forEach((tile, index) => {
    if (!tile) return;
    if (linked.has(tile.id)) {
      statuses.set(tile.id, "linked");
      return;
    }

    if (isAnswerLetter(tile.text) && (remaining.get(tile.text) ?? 0) > 0) {
      statuses.set(tile.id, "loose");
      remaining.set(tile.text, remaining.get(tile.text) - 1);
      return;
    }

    statuses.set(tile.id, "clutter");
  });

  return statuses;
}

function getLinkedTargetIds(remaining) {
  const linked = new Set();
  const pairs = [];

  state.board.forEach((tile, index) => {
    if (!tile || !isAnswerLetter(tile.text)) return;

    const size = getBoardSize();
    const row = Math.floor(index / size);
    const col = index % size;
    const right = col < size - 1 ? state.board[index + 1] : null;
    const down = row < size - 1 ? state.board[index + size] : null;

    // Only consecutive answer neighbors turn green; G beside E in GREEN stays yellow.
    if (isConsecutivePair(tile, right)) pairs.push([tile, right]);
    if (isConsecutivePair(tile, down)) pairs.push([tile, down]);
  });

  pairs.forEach(([first, second]) => {
    const needed = new Map();
    if (!linked.has(first.id)) needed.set(first.text, (needed.get(first.text) ?? 0) + 1);
    if (!linked.has(second.id)) needed.set(second.text, (needed.get(second.text) ?? 0) + 1);

    const hasCapacity = Array.from(needed).every(([letter, count]) => {
      return (remaining.get(letter) ?? 0) >= count;
    });
    if (!hasCapacity) return;

    linked.add(first.id);
    linked.add(second.id);
    needed.forEach((count, letter) => {
      remaining.set(letter, remaining.get(letter) - count);
    });
  });

  return linked;
}

function getTargetLetterCounts() {
  return state.target.split("").reduce((counts, letter) => {
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
    return counts;
  }, new Map());
}

function isAnswerLetter(letter) {
  return state.target.includes(letter);
}

function isConsecutivePair(first, second) {
  if (!first || !second) return false;
  return state.target.includes(`${first.text}${second.text}`);
}

function getNeighborIndexes(index) {
  const size = getBoardSize();
  const row = Math.floor(index / size);
  const col = index % size;
  const indexes = [];

  if (row > 0) indexes.push(index - size);
  if (row < size - 1) indexes.push(index + size);
  if (col > 0) indexes.push(index - 1);
  if (col < size - 1) indexes.push(index + 1);

  return indexes;
}

function move(direction) {
  if (!state || state.over || state.animating) return;

  const before = serializeBoard();
  const animations = {
    slides: [],
    appears: [],
    clears: [],
  };
  let scoreGain = 0;
  const nextBoard = Array.from({ length: getBoardCellCount() }, () => null);
  const lines = getLines(direction);
  const mergeBudget = getMergeBudget();

  lines.forEach((line) => {
    const items = line
      .map((index) => {
        const tile = state.board[index];
        return tile ? { tile, from: index } : null;
      })
      .filter(Boolean);
    const { output, clears, score } = collapseLine(items, mergeBudget);
    scoreGain += score;

    output.forEach((item, outputIndex) => {
      const targetIndex = line[outputIndex];
      nextBoard[targetIndex] = item.tile;
      animations.slides.push({
        id: item.tile.id,
        to: targetIndex,
        consume: false,
      });

      item.consumed?.forEach((source) => {
        animations.slides.push({
          id: source.tile.id,
          to: targetIndex,
          consume: true,
        });
      });

      if (item.consumed?.length) {
        animations.appears.push({
          index: targetIndex,
        });
      }
    });

    clears.forEach((clear) => {
      const targetIndex = line[clear.outputIndex];
      clear.sources.forEach((source) => {
        animations.slides.push({
          id: source.tile.id,
          to: targetIndex,
          consume: true,
        });
      });
      animations.clears.push({
        letter: clear.letter,
        index: targetIndex,
      });
    });
  });

  const after = serializeBoard(nextBoard);
  const changed = before !== after;

  if (!changed) {
    playSound("blocked");
    pulseBoard();
    return;
  }

  state.selectedTileId = null;
  playSound(animations.appears.length || animations.clears.length ? "merge" : "slide");
  state.history.push(createSnapshot());
  state.animating = true;
  state.moves += 1;
  state.board = nextBoard;
  state.score += scoreGain;
  renderHud();

  runMoveAnimation(animations, () => {
    syncTiles();

    if (checkWin()) {
      state.animating = false;
      renderHud();
      endGame(true, "Solved", `${state.target.toUpperCase()} lined up in ${state.moves} moves.`);
      playSound("win");
      return;
    }

    const spawnedIds = new Set();
    const spawned = addTile(randomWordLetter(), "extra");
    if (spawned) spawnedIds.add(spawned.tile.id);
    if (spawned) playSound("spawn");

    state.animating = false;
    syncTiles(spawnedIds);
    renderHud();
  });
}

function createSnapshot() {
  return {
    board: state.board.map((tile) => (tile ? { ...tile } : null)),
    score: state.score,
    moves: state.moves,
    deletesLeft: state.deletesLeft,
    nextTileId,
  };
}

function undoMove() {
  if (!state || state.animating || state.undosLeft <= 0 || !state.history.length) return;

  const snapshot = state.history.pop();
  state.board = snapshot.board.map((tile) => (tile ? { ...tile } : null));
  state.score = snapshot.score;
  state.moves = snapshot.moves;
  state.undosLeft -= 1;
  state.deletesLeft = snapshot.deletesLeft;
  state.selectedTileId = null;
  state.over = false;
  state.won = false;
  nextTileId = snapshot.nextTileId;
  bannerElement.classList.add("hidden");
  syncTiles();
  renderHud();
  playSound("blocked");
}

function canDeleteSelectedTile() {
  return Boolean(
    state &&
      !state.animating &&
      !state.over &&
      state.deletesLeft > 0 &&
      state.board.some((tile) => tile?.id === state.selectedTileId),
  );
}

function deleteSelectedTile() {
  if (!state || state.animating || state.over) return;

  if (!canDeleteSelectedTile()) {
    playSound("blocked");
    pulseBoard();
    return;
  }

  const index = state.board.findIndex((tile) => tile?.id === state.selectedTileId);
  state.history.push(createSnapshot());
  state.board[index] = null;
  state.selectedTileId = null;
  state.deletesLeft -= 1;
  syncTiles();
  renderHud();
  playSound("delete");
}

function normalizeSelection() {
  if (!state?.selectedTileId) return;
  if (!state.board.some((tile) => tile?.id === state.selectedTileId)) {
    state.selectedTileId = null;
  }
}

function selectTileAtPoint(clientX, clientY) {
  if (!state || state.animating || state.over) return;

  const index = getTileIndexAtPoint(clientX, clientY);
  const tile = index === null ? null : state.board[index];
  state.selectedTileId = tile ? tile.id : null;
  syncTiles();
  renderHud();
}

function getTileIndexAtPoint(clientX, clientY) {
  const rect = boardElement.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

  const size = getBoardSize();
  const gap = parseFloat(getComputedStyle(boardElement).getPropertyValue("--board-gap")) || 0;
  const tileSize = (rect.width - gap * (size - 1)) / size;
  const step = tileSize + gap;
  const col = Math.floor(x / step);
  const row = Math.floor(y / step);
  if (col < 0 || row < 0 || col >= size || row >= size) return null;
  if (x - col * step > tileSize || y - row * step > tileSize) return null;

  return row * size + col;
}

function collapseLine(items, mergeBudget) {
  const output = [];
  const clears = [];
  let score = 0;

  for (let index = 0; index < items.length; index += 1) {
    const current = items[index];
    const next = items[index + 1];

    if (next && current.tile.text === next.tile.text && canMergeSameLetter(current.tile.text, mergeBudget)) {
      output.push({
        ...current,
        consumed: [next],
      });
      mergeBudget.set(current.tile.text, mergeBudget.get(current.tile.text) - 1);
      score += 25;
      index += 1;
      continue;
    }

    output.push(current);
  }

  return { output, clears, score };
}

function canMergeSameLetter(letter, mergeBudget) {
  return (mergeBudget.get(letter) ?? 0) > 0;
}

function getMergeBudget() {
  const targetCounts = getTargetLetterCounts();
  const boardCounts = state.board.reduce((counts, tile) => {
    if (!tile) return counts;
    counts.set(tile.text, (counts.get(tile.text) ?? 0) + 1);
    return counts;
  }, new Map());

  return Array.from(boardCounts).reduce((budget, [letter, count]) => {
    budget.set(letter, Math.max(0, count - (targetCounts.get(letter) ?? 0)));
    return budget;
  }, new Map());
}

function runMoveAnimation(animations, onDone) {
  animations.slides.forEach((slide) => {
    const tileElement = tileElements.get(slide.id);
    if (!tileElement) return;
    tileElement.classList.add("sliding");
    setTilePosition(tileElement, slide.to);
  });

  window.setTimeout(() => {
    animations.slides.forEach((slide) => {
      const tileElement = tileElements.get(slide.id);
      if (tileElement) tileElement.classList.remove("sliding");
    });

    animations.slides
      .filter((slide) => slide.consume)
      .forEach((slide) => {
        const tileElement = tileElements.get(slide.id);
        if (tileElement) tileElement.classList.add("consuming");
      });

    animations.clears.forEach(({ letter, index }) => flashClear(letter, index));
    animations.appears.forEach(({ index }) => flashMerge(index));

    window.setTimeout(() => {
      animations.slides
        .filter((slide) => slide.consume)
        .forEach((slide) => {
          const tileElement = tileElements.get(slide.id);
          if (!tileElement) return;
          tileElement.remove();
          tileElements.delete(slide.id);
        });

      onDone();
    }, MERGE_MS);
  }, SLIDE_MS);
}

function flashClear(letter, index) {
  const burst = document.createElement("div");
  burst.className = "word-burst";
  burst.textContent = `+${letter}`;
  setTilePosition(burst, index);
  burstLayerElement.append(burst);
  window.setTimeout(() => burst.remove(), 660);
}

function flashMerge(index) {
  const ripple = document.createElement("div");
  ripple.className = "merge-ripple";
  setTilePosition(ripple, index);
  burstLayerElement.append(ripple);
  window.setTimeout(() => ripple.remove(), 420);
}

function getBoardSize(size = state?.size) {
  return size ?? DIFFICULTIES[currentDifficulty].size;
}

function getBoardCellCount(size = getBoardSize()) {
  return size * size;
}

function checkWin() {
  return getLineSnapshots().some((line) => line.word === state.target);
}

function getLineSnapshots() {
  const lines = [];
  const size = getBoardSize();
  const wordLength = state.target.length;

  for (let row = 0; row < size; row += 1) {
    for (let startCol = 0; startCol <= size - wordLength; startCol += 1) {
      const indexes = [];
      for (let offset = 0; offset < wordLength; offset += 1) indexes.push(row * size + startCol + offset);
      lines.push(makeSnapshot(indexes, "row", row + 1));
    }
  }

  for (let col = 0; col < size; col += 1) {
    for (let startRow = 0; startRow <= size - wordLength; startRow += 1) {
      const indexes = [];
      for (let offset = 0; offset < wordLength; offset += 1) indexes.push((startRow + offset) * size + col);
      lines.push(makeSnapshot(indexes, "column", col + 1));
    }
  }

  return lines;
}

function makeSnapshot(indexes, type, number) {
  const letters = indexes.map((index) => state.board[index]?.text ?? "");
  const word = letters.join("");
  const matches = letters.reduce((total, letter, index) => {
    return total + (letter === state.target[index] ? 1 : 0);
  }, 0);

  return { indexes, type, number, letters, word, matches };
}

function getLines(direction) {
  const lines = [];
  const size = getBoardSize();

  if (direction === "left" || direction === "right") {
    for (let row = 0; row < size; row += 1) {
      const line = [];
      for (let col = 0; col < size; col += 1) line.push(row * size + col);
      lines.push(direction === "left" ? line : line.reverse());
    }
  }

  if (direction === "up" || direction === "down") {
    for (let col = 0; col < size; col += 1) {
      const line = [];
      for (let row = 0; row < size; row += 1) line.push(row * size + col);
      lines.push(direction === "up" ? line : line.reverse());
    }
  }

  return lines;
}

function serializeBoard(board = state.board) {
  return board.map((tile) => (tile ? `${tile.id}:${tile.text}` : "")).join("|");
}

function endGame(won, title, text) {
  state.over = true;
  state.won = won;
  bannerTitleElement.textContent = title;
  bannerTextElement.textContent = text;
  bannerElement.classList.remove("hidden");
}

function showModeChooser({ title = "Choose mode", text = "Pick a board size to start a new hidden word.", cancellable = false } = {}) {
  quitTitleElement.textContent = title;
  quitTextElement.textContent = text;
  cancelQuitElement.classList.toggle("hidden", !cancellable);
  quitModalElement.classList.remove("hidden");
}

function pulseBoard() {
  boardElement.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(6px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 170, easing: "ease-out" },
  );
}

function shuffleArray(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

undoButtonElement.addEventListener("click", undoMove);
deleteButtonElement.addEventListener("click", deleteSelectedTile);
quitButtonElements.forEach((button) => button.addEventListener("click", () => {
  showModeChooser({
    title: "Quit game?",
    text: "Choose a mode to restart with a fresh hidden word.",
    cancellable: true,
  });
}));
cancelQuitElement.addEventListener("click", () => {
  quitModalElement.classList.add("hidden");
});
modeButtonElements.forEach((button) => {
  button.addEventListener("click", () => {
    quitModalElement.classList.add("hidden");
    createGame(button.dataset.difficulty);
  });
});
soundToggleElement.addEventListener("click", () => {
  setSoundEnabled(!soundEnabled);
  if (soundEnabled) playSound("spawn");
});
playAgainElement.addEventListener("click", () => {
  showModeChooser({
    title: "New game",
    text: "Choose a mode for the next hidden word.",
    cancellable: true,
  });
});
reactionButtonElements.forEach((button) => {
  button.addEventListener("click", () => toggleReaction(button.dataset.reaction));
});

window.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const directionByKey = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };
  const direction = directionByKey[event.key] ?? directionByKey[event.key.toLowerCase()];
  if (!direction) return;
  event.preventDefault();
  move(direction);
}, { capture: true });

let touchStart = null;
boardElement.addEventListener("pointerdown", (event) => {
  touchStart = { x: event.clientX, y: event.clientY };
});

boardElement.addEventListener("pointerup", (event) => {
  if (!touchStart) return;

  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;

  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
    selectTileAtPoint(event.clientX, event.clientY);
    return;
  }

  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
});

showModeChooser();
loadReactions();
