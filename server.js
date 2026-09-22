// Fastest Finger First — live buzzer quiz server
// Single in-memory game (one event at a time). No database needed.

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const ROUND_MS = 20000;   // seconds allowed per question

/* The ten team names, in the order they appear in the player's dropdown. The
   page carries the same list; the server is what actually enforces it. */
const TEAMS = ['#1 - Mercury','#2 - Venus','#3 - Earth','#4 - Mars','#5 - Jupiter','#6 - Saturn','#7 - Uranus','#8 - Neptune','#9 - Pluto','#10 - Apollo'];
const teamRank = (t) => { const i = TEAMS.indexOf(t); return i < 0 ? 999 : i; };

/* Bumped whenever server.js and index.html must be deployed together. The page
   compares this against its own copy and warns on screen if only one was
   updated — otherwise a half-updated deploy fails silently and confusingly. */
const APP_VERSION = 'teams-2';

/* ---------------- question bank (Logical Sequence set) ----------------
   Options are A-D; `ans` is the correct order as a string of those letters. */
const QUESTIONS = [
  {n:1,cat:"LOGIC",prompt:"Arrange the following medical stages in a logical chronological sequence.",dir:"FIRST → LAST",opts:{A:"Diagnosis",B:"Illness",C:"Doctor Consultation",D:"Treatment"},ans:"BCAD",explain:[["B","Illness"],["C","Doctor Consultation"],["A","Diagnosis"],["D","Treatment"]]},
  {n:2,cat:"LOGIC",prompt:"Arrange the life cycle stages of a frog in a logical order.",dir:"FIRST → LAST",opts:{A:"Tadpole",B:"Adult Frog",C:"Egg",D:"Froglet"},ans:"CADB",explain:[["C","Egg"],["A","Tadpole"],["D","Froglet"],["B","Adult Frog"]]},
  {n:3,cat:"LOGIC",prompt:"Arrange the following geographical locations by area in a logical ascending order.",dir:"SMALLEST → LARGEST",opts:{A:"Village",B:"State",C:"3 Tier City",D:"District"},ans:"ACDB",explain:[["A","Village"],["C","3 Tier City"],["D","District"],["B","State"]]},
  {n:4,cat:"LOGIC",prompt:"Arrange in sequence the right life cycle of a person.",dir:"FIRST → LAST",opts:{A:"College",B:"Child",C:"School",D:"Employment"},ans:"BCAD",explain:[["B","Child"],["C","School"],["A","College"],["D","Employment"]]},
  {n:5,cat:"LOGIC",prompt:"Arrange the below categories in the logical sequence.",dir:"FIRST → LAST",opts:{A:"Yarn",B:"Plant",C:"Saree",D:"Cotton"},ans:"BDAC",explain:[["B","Plant"],["D","Cotton"],["A","Yarn"],["C","Saree"]]},
  {n:6,cat:"LOGIC",prompt:"Arrange the following in the logical sequence.",dir:"FIRST → LAST",opts:{A:"Curd",B:"Butter",C:"Milk",D:"Cow"},ans:"DCAB",explain:[["D","Cow"],["C","Milk"],["A","Curd"],["B","Butter"]]},
  {n:7,cat:"LOGIC",prompt:"Arrange the following corporate roles as per their order from lowest to highest.",dir:"LOWEST → HIGHEST",opts:{A:"Manager",B:"CEO",C:"Head of Department",D:"Chairman of Board"},ans:"ACBD",explain:[["A","Manager"],["C","Head of Department"],["B","CEO"],["D","Chairman of Board"]]},
  {n:8,cat:"LOGIC",prompt:"Arrange the following in natural progression.",dir:"FIRST → LAST",opts:{A:"Plant",B:"Seed",C:"Fruit",D:"Flower"},ans:"BADC",explain:[["B","Seed"],["A","Plant"],["D","Flower"],["C","Fruit"]]},
  {n:9,cat:"LOGIC",prompt:"Arrange the following daily activities in order.",dir:"FIRST → LAST",opts:{A:"Brush Teeth",B:"Wake Up",C:"Sleep",D:"Office / School"},ans:"BADC",explain:[["B","Wake Up"],["A","Brush Teeth"],["D","Office / School"],["C","Sleep"]]},
  {n:10,cat:"LOGIC",prompt:"Arrange the following distances from smallest to longest.",dir:"SMALLEST → LONGEST",opts:{A:"Centimeter",B:"Meter",C:"Kilometer",D:"Millimeter"},ans:"DABC",explain:[["D","Millimeter"],["A","Centimeter"],["B","Meter"],["C","Kilometer"]]},
  {n:11,cat:"LOGIC",prompt:"Arrange the days from last to first on the Diwali occasion.",dir:"LAST → FIRST",opts:{A:"Govardhan Puja",B:"Lakshmi Puja",C:"Dhanteras",D:"Choti Diwali"},ans:"ABDC",explain:[["A","Govardhan Puja"],["B","Lakshmi Puja"],["D","Choti Diwali"],["C","Dhanteras"]]},
  {n:12,cat:"LOGIC",prompt:"Arrange the following in ascending order.",dir:"LOWEST → HIGHEST",opts:{A:"Senior Secondary",B:"Matriculation",C:"Bachelor Degree",D:"PhD"},ans:"BACD",explain:[["B","Matriculation"],["A","Senior Secondary"],["C","Bachelor Degree"],["D","PhD"]]},
  {n:13,cat:"LOGIC",prompt:"Arrange the following from before to end when you travel by flight.",dir:"FIRST → LAST",opts:{A:"Take Off",B:"Landing",C:"Web Check In",D:"Security Check"},ans:"CDAB",explain:[["C","Web Check In"],["D","Security Check"],["A","Take Off"],["B","Landing"]]},
  {n:14,cat:"LOGIC",prompt:"Arrange the below as per the food chain model.",dir:"FIRST → LAST",opts:{A:"Frog",B:"Grasshopper",C:"Snake",D:"Grass"},ans:"DBAC",explain:[["D","Grass"],["B","Grasshopper"],["A","Frog"],["C","Snake"]]}
];

/* ---------------- single in-memory game ---------------- */
let game = null;
let gameSeq = 0;

function genPin(){ return String(Math.floor(1000 + Math.random()*9000)); }
function genId(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }

function freshGame(){
  gameSeq++;
  return {
    id: 'g' + gameSeq + '_' + genId(),
    pin: genPin(),
    players: [],           // {id: token, team, name, active, socketId}
    started: false,
    qIndex: -1,
    used: [],               // indexes of questions already played
    answers: {},            // token -> {order:[], submitted, submitTime}
    questionStart: 0,
    roundActive: false,
    roundTimer: null,
    honour: [],              // {round, cat, team, name, timeMs}
    lastQuestionPayload: null,
    lastResultsPayload: null,
    lastFinalPayload: null,
    lastBoardPayload: null,
    phase: 'lobby'           // lobby | board | question | results | final
  };
}

function publicPlayers(){
  return game.players
    .slice()
    .sort((a, b) => teamRank(a.team) - teamRank(b.team))
    .map(p => ({ id: p.id, team: p.team, name: p.name, active: p.active }));
}

function lobbySnapshot(){
  return { phase: 'lobby', pin: game.pin, gameId: game.id, players: publicPlayers(), started: game.started };
}

function snapshotForNewConnection(){
  if (!game) return { phase: 'no-game' };
  if (game.phase === 'board') return { phase: 'board', payload: game.lastBoardPayload, pin: game.pin, gameId: game.id, players: publicPlayers() };
  if (game.phase === 'question') return { phase: 'question', payload: game.lastQuestionPayload, pin: game.pin, gameId: game.id, players: publicPlayers() };
  if (game.phase === 'results') return { phase: 'results', payload: game.lastResultsPayload, pin: game.pin, gameId: game.id, players: publicPlayers() };
  if (game.phase === 'final') return { phase: 'final', payload: game.lastFinalPayload, pin: game.pin, gameId: game.id, players: publicPlayers() };
  return lobbySnapshot();
}

function broadcastLobby(){
  game.phase = 'lobby';
  io.emit('game:lobby', lobbySnapshot());
}

function freshQuestionForClient(idx){
  const q = QUESTIONS[idx];
  return { n: q.n, cat: q.cat, prompt: q.prompt, dir: q.dir, opts: q.opts };
}

// The host ends the game deliberately — it never stops on its own except when
// the question bank runs out.
function endGame(){
  if (!game) return;
  clearTimeout(game.roundTimer);
  game.roundActive = false;
  game.phase = 'final';
  const payload = {
    honour: game.honour,
    stillStanding: game.players.filter(p => p.active).map(p => ({ team: p.team, name: p.name }))
  };
  game.lastFinalPayload = payload;
  io.emit('game:final', payload);
}

/* The host drives the game from a board of numbered questions, choosing which
   one to play next rather than marching through them in order. */
function boardSnapshot(){
  return {
    total: QUESTIONS.length,
    used: game.used.slice(),
    players: publicPlayers(),
    activeCount: game.players.filter(p => p.active).length
  };
}

/* Any change to who is in play has to reach the host's board and every phone,
   whatever screen they happen to be on. */
function pushPlayers(){
  if (!game) return;
  if (game.phase === 'board') game.lastBoardPayload = boardSnapshot();
  io.emit('game:players', { players: publicPlayers(), activeCount: game.players.filter(p => p.active).length });
}

function showBoard(){
  if (!game) return;
  clearTimeout(game.roundTimer);
  game.roundActive = false;
  game.phase = 'board';
  game.lastBoardPayload = boardSnapshot();
  io.emit('game:board', game.lastBoardPayload);
}

function startQuestion(idx){
  if (!game) return;
  idx = Number(idx);
  if (!(idx >= 0 && idx < QUESTIONS.length)) return;
  if (game.used.indexOf(idx) > -1) return;        // already played
  if (game.players.length === 0) return;
  // Every round winner steps out, so eventually the field empties. Say so plainly
  // rather than starting a question nobody can answer.
  if (game.players.filter(p => p.active).length === 0){
    io.emit('game:notice', 'Every team has won a round and stepped aside — exit to the winners list, or bring teams back in.');
    return;
  }
  clearTimeout(game.roundTimer);
  game.qIndex = idx;
  game.used.push(idx);

  const remaining = game.players.filter(p => p.active).length;
  game.answers = {};
  game.questionStart = Date.now();
  game.roundActive = true;
  game.phase = 'question';
  const payload = {
    q: freshQuestionForClient(idx), qNum: idx + 1, total: QUESTIONS.length,
    activeCount: remaining, startedAt: game.questionStart, roundMs: ROUND_MS,
    activeIds: game.players.filter(p => p.active).map(p => p.id),
    players: publicPlayers()
  };
  game.lastQuestionPayload = payload;
  io.emit('question:show', payload);
  game.roundTimer = setTimeout(() => endRound(), ROUND_MS + 400);
}

function maybeAutoEnd(){
  if (!game || !game.roundActive) return;
  const active = game.players.filter(p => p.active);
  const allIn = active.length > 0 && active.every(p => game.answers[p.id] && game.answers[p.id].submitted);
  if (allIn) endRound();
}

function endRound(){
  if (!game || !game.roundActive) return;
  game.roundActive = false;
  clearTimeout(game.roundTimer);
  const q = QUESTIONS[game.qIndex];
  const active = game.players.filter(p => p.active);
  let results = active.map(p => {
    const a = game.answers[p.id];
    const submitted = a && a.submitted;
    const seq = submitted ? a.order.join('') : null;
    const correct = submitted && seq === q.ans;
    const timeMs = submitted ? (a.submitTime - game.questionStart) : null;
    return { playerId: p.id, team: p.team, name: p.name, seq, correct, timeMs };
  });
  results.sort((x, y) => {
    if (x.correct && y.correct) return x.timeMs - y.timeMs;
    if (x.correct) return -1;
    if (y.correct) return 1;
    if (x.timeMs != null && y.timeMs != null) return x.timeMs - y.timeMs;
    if (x.timeMs != null) return -1;
    if (y.timeMs != null) return 1;
    return 0;
  });
  let rank = 1;
  results.forEach(r => { r.rank = r.correct ? rank++ : null; });
  const winner = results.find(r => r.rank === 1) || null;
  if (winner){
    const p = game.players.find(pl => pl.id === winner.playerId);
    if (p) p.active = false;
    game.honour.push({ round: q.n, cat: q.cat, team: winner.team, name: winner.name, timeMs: winner.timeMs });
  }
  game.phase = 'results';
  const payload = {
    results, winner, qNum: q.n, total: QUESTIONS.length,
    correctSeq: q.ans, explain: q.explain,
    isLastRound: (game.used.length >= QUESTIONS.length),
    remainingActive: game.players.filter(p => p.active).length,
    players: publicPlayers()
  };
  game.lastResultsPayload = payload;
  io.emit('round:results', payload);
}

io.on('connection', (socket) => {
  socket.emit('server:version', APP_VERSION);
  socket.emit('server:teams', TEAMS);
  socket.emit('game:snapshot', snapshotForNewConnection());

  socket.on('host:generatePin', () => {
    game = freshGame();
    socket.data.role = 'host';
    broadcastLobby();
  });

  socket.on('host:newPin', () => {
    if (!game) return;
    game.pin = genPin();
    broadcastLobby();
  });

  socket.on('host:removePlayer', (playerId) => {
    if (!game) return;
    game.players = game.players.filter(p => p.id !== playerId);
    delete game.answers[playerId];
    if (game.phase === 'lobby') broadcastLobby();
    else { pushPlayers(); maybeAutoEnd(); }
  });

  /* The host can stand a team down, or bring a round winner back in, at any
     point — the automatic rule is just the default, not a cage. */
  socket.on('host:setActive', ({ playerId, active } = {}) => {
    if (!game) return;
    const p = game.players.find(pl => pl.id === playerId);
    if (!p) return;
    p.active = !!active;
    if (!p.active) delete game.answers[p.id];
    if (game.phase === 'lobby') broadcastLobby();
    else { pushPlayers(); maybeAutoEnd(); }
  });

  socket.on('host:reinstateAll', () => {
    if (!game) return;
    game.players.forEach(p => { p.active = true; });
    if (game.phase === 'lobby') broadcastLobby();
    else pushPlayers();
  });

  socket.on('player:join', ({ team, name, pin, token } = {}, ack) => {
    if (!game){ if (typeof ack === 'function') ack({ ok: false, reason: 'no_game' }); return; }
    if (game.started){ if (typeof ack === 'function') ack({ ok: false, reason: 'already_started' }); return; }
    team = String(team || '').trim();
    name = String(name || '').trim().slice(0, 30);
    pin = String(pin || '').trim();
    token = String(token || '').trim().slice(0, 64) || genId();
    if (!team || !name){ if (typeof ack === 'function') ack({ ok: false, reason: 'missing_fields' }); return; }
    if (TEAMS.indexOf(team) < 0){ if (typeof ack === 'function') ack({ ok: false, reason: 'bad_team' }); return; }
    if (pin !== game.pin){ if (typeof ack === 'function') ack({ ok: false, reason: 'bad_pin' }); return; }
    socket.data.role = 'player';
    socket.data.token = token;
    // Re-joining with a token already in this game (e.g. a form double-submit) just updates the seat.
    var existing = game.players.find(p => p.id === token);
    if (existing){ existing.team = team; existing.name = name; existing.socketId = socket.id; }
    else game.players.push({ id: token, team, name, active: true, socketId: socket.id });
    if (typeof ack === 'function') ack({ ok: true, token, gameId: game.id });
    broadcastLobby();
  });

  // A phone that briefly lost its connection (screen lock, WiFi hiccup) reconnects with a NEW
  // socket but the SAME stored token, so it resumes its seat instead of being silently dropped.
  socket.on('player:rejoin', ({ token, gameId } = {}, ack) => {
    if (!game || game.id !== gameId){ if (typeof ack === 'function') ack({ ok: false }); return; }
    var p = game.players.find(pl => pl.id === token);
    if (!p){ if (typeof ack === 'function') ack({ ok: false }); return; }
    p.socketId = socket.id;
    socket.data.role = 'player';
    socket.data.token = token;
    if (typeof ack === 'function') ack({ ok: true, snapshot: snapshotForNewConnection() });
  });

  socket.on('host:startGame', () => {
    if (!game || !game.players.length || game.started) return;
    game.started = true;
    game.qIndex = -1;
    game.used = [];
    io.emit('game:started');
    showBoard();                       // host picks the first question off the board
  });

  socket.on('host:pickQuestion', (idx) => { startQuestion(idx); });
  socket.on('host:showBoard', () => { showBoard(); });
  socket.on('host:nextQuestion', () => { showBoard(); });   // older clients
  socket.on('host:endRoundNow', () => { endRound(); });
  socket.on('host:endGame', () => { endGame(); });

  socket.on('player:leave', ({ token } = {}) => {
    if (!game) return;
    const pid = token || socket.data.token;
    if (!pid) return;
    game.players = game.players.filter(p => p.id !== pid);
    delete game.answers[pid];
    if (game.phase === 'lobby') broadcastLobby();
    else maybeAutoEnd();   // they may have been the last one the round was waiting on
  });

  socket.on('player:submit', ({ token, order } = {}) => {
    if (!game || !game.roundActive) return;
    const pid = token || socket.data.token;
    const p = game.players.find(pl => pl.id === pid && pl.active);
    if (!p) return;
    if (game.answers[pid] && game.answers[pid].submitted) return;
    if (!Array.isArray(order) || order.length !== 4) return;
    game.answers[pid] = { order: order.slice(0, 4), submitted: true, submitTime: Date.now() };
    maybeAutoEnd();
  });

  socket.on('host:newGame', () => {
    game = null;
    io.emit('game:reset');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Fastest Finger First listening on port ' + PORT));
