const board = document.querySelector('#game-board');
const context = board.getContext('2d');
const scoreElement = document.querySelector('#score');
const highScoreElement = document.querySelector('#high-score');
const comboElement = document.querySelector('#combo');
const statusElement = document.querySelector('#game-status');
const difficultyElement = document.querySelector('#difficulty');
const startButton = document.querySelector('#start-game');
const pauseButton = document.querySelector('#pause-game');
const restartButton = document.querySelector('#restart-game');

const gridSize = 20;
const cellSize = board.width / gridSize;
const directions = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let snake;
let food;
let direction;
let nextDirection;
let score;
let highScore = Number(localStorage.getItem('kei-worm-high-score') || 0);
let difficulty = difficultyElement.value;
let enemy;
let hazards;
let powerup;
let shieldTurns;
let combo;
let comboUntil;
let steps;
let timer = null;
let running = false;
let paused = false;

const difficultySettings = {
  easy: { interval: 150, enemyEvery: 5, hazardCount: 1, shieldTurns: 4, comboMultiplier: 1 },
  normal: { interval: 120, enemyEvery: 3, hazardCount: 2, shieldTurns: 3, comboMultiplier: 2 },
  hard: { interval: 90, enemyEvery: 2, hazardCount: 3, shieldTurns: 2, comboMultiplier: 3 },
};

function resetGame() {
  snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  direction = directions.right;
  nextDirection = direction;
  score = 0;
  combo = 0;
  comboUntil = 0;
  shieldTurns = 0;
  steps = 0;
  hazards = Array.from({ length: difficultySettings[difficulty].hazardCount }, () => createFreeCell());
  enemy = createFreeCell();
  powerup = createFreeCell();
  food = createFood();
  scoreElement.textContent = score;
  highScoreElement.textContent = highScore;
  comboElement.textContent = combo;
  draw();
}

function occupied(candidate) {
  return snake?.some((part) => part.x === candidate.x && part.y === candidate.y)
    || hazards?.some((part) => part.x === candidate.x && part.y === candidate.y)
    || enemy?.x === candidate.x && enemy?.y === candidate.y
    || powerup?.x === candidate.x && powerup?.y === candidate.y;
}

function createFreeCell() {
  let candidate;
  do {
    candidate = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
  } while (occupied(candidate));
  return candidate;
}

function createFood() {
  let candidate;
  do {
    candidate = { x: Math.floor(Math.random() * gridSize), y: Math.floor(Math.random() * gridSize) };
  } while (occupied(candidate));
  return candidate;
}

function setDirection(name) {
  const candidate = directions[name];
  if (!candidate || (candidate.x + direction.x === 0 && candidate.y + direction.y === 0)) return;
  nextDirection = candidate;
}

function startGame() {
  if (running && !paused) return;
  if (!running) resetGame();
  running = true;
  paused = false;
  statusElement.textContent = 'RUNNING';
  clearInterval(timer);
  timer = setInterval(step, difficultySettings[difficulty].interval);
}

function pauseGame() {
  if (!running) return;
  paused = !paused;
  statusElement.textContent = paused ? 'PAUSED' : 'RUNNING';
}

function restartGame() {
  clearInterval(timer);
  timer = null;
  running = false;
  paused = false;
  resetGame();
  startGame();
}

function endGame() {
  clearInterval(timer);
  timer = null;
  running = false;
  paused = false;
  statusElement.textContent = 'GAME OVER';
  draw();
}

function step() {
  if (!running || paused) return;
  direction = nextDirection;
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const hitWall = head.x < 0 || head.x >= gridSize || head.y < 0 || head.y >= gridSize;
  const hitSelf = snake.some((part) => part.x === head.x && part.y === head.y);
  const hitHazard = hazards.some((part) => part.x === head.x && part.y === head.y);
  const hitEnemy = enemy.x === head.x && enemy.y === head.y;
  if (hitWall || hitSelf || ((hitHazard || hitEnemy) && shieldTurns === 0)) {
    endGame();
    return;
  }
  if (hitHazard || hitEnemy) shieldTurns -= 1;
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    combo = Date.now() < comboUntil ? combo + 1 : 1;
    comboUntil = Date.now() + 1800;
    score += 10 * combo * difficultySettings[difficulty].comboMultiplier;
    highScore = Math.max(highScore, score);
    localStorage.setItem('kei-worm-high-score', highScore);
    scoreElement.textContent = score;
    highScoreElement.textContent = highScore;
    comboElement.textContent = combo;
    food = createFood();
    if (Math.random() < .35) powerup = createFreeCell();
  } else {
    snake.pop();
  }
  if (powerup && head.x === powerup.x && head.y === powerup.y) {
    shieldTurns = difficultySettings[difficulty].shieldTurns;
    powerup = null;
    statusElement.textContent = 'SHIELD ACTIVE';
  }
  if (Date.now() >= comboUntil) {
    combo = 0;
    comboElement.textContent = combo;
  }
  steps += 1;
  if (steps % difficultySettings[difficulty].enemyEvery === 0) moveEnemy();
  if (steps % 10 === 0) moveHazards();
  draw();
}

function moveEnemy() {
  const names = Object.keys(directions).filter((name) => directions[name].x + (enemy.direction?.x || 0) !== 0 || directions[name].y + (enemy.direction?.y || 0) !== 0);
  const move = directions[names[Math.floor(Math.random() * names.length)]];
  const next = { x: enemy.x + move.x, y: enemy.y + move.y };
  if (next.x >= 0 && next.x < gridSize && next.y >= 0 && next.y < gridSize) {
    enemy = { ...next, direction: move };
  }
}

function moveHazards() {
  hazards = hazards.map((hazard) => {
    const next = { x: hazard.x + (Math.random() > .5 ? 1 : -1), y: hazard.y };
    return next.x >= 0 && next.x < gridSize ? next : hazard;
  });
}

function draw() {
  context.fillStyle = '#051011';
  context.fillRect(0, 0, board.width, board.height);
  context.fillStyle = '#ff4f9a';
  context.fillRect(food.x * cellSize, food.y * cellSize, cellSize, cellSize);
  context.fillStyle = '#ff7b36';
  hazards.forEach((part) => context.fillRect(part.x * cellSize, part.y * cellSize, cellSize, cellSize));
  context.fillStyle = '#ffdd57';
  if (powerup) context.fillRect(powerup.x * cellSize + 3, powerup.y * cellSize + 3, cellSize - 6, cellSize - 6);
  context.fillStyle = '#ff4f9a';
  context.fillRect(enemy.x * cellSize + 2, enemy.y * cellSize + 2, cellSize - 4, cellSize - 4);
  snake.forEach((part, index) => {
    context.fillStyle = index === 0 ? '#e7fffc' : '#38f2d0';
    context.fillRect(part.x * cellSize + 1, part.y * cellSize + 1, cellSize - 2, cellSize - 2);
  });
}

document.addEventListener('keydown', (event) => {
  const keyMap = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
  if (keyMap[event.key]) {
    event.preventDefault();
    setDirection(keyMap[event.key]);
  }
  if (event.key === ' ' || event.key.toLowerCase() === 'p') {
    event.preventDefault();
    pauseGame();
  }
});

document.querySelectorAll('[data-direction]').forEach((button) => {
  button.addEventListener('click', () => setDirection(button.dataset.direction));
});
difficultyElement.addEventListener('change', () => {
  difficulty = difficultyElement.value;
  restartGame();
});
startButton.addEventListener('click', startGame);
pauseButton.addEventListener('click', pauseGame);
restartButton.addEventListener('click', restartGame);

resetGame();
