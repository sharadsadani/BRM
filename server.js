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

const ROUND_MS = 15000;

/* ---------------- question bank (from Ganesh Utsav 2026 quiz deck) ---------------- */
const QUESTIONS = [
  {n:1,cat:"MATHS",prompt:"Arrange these numbers from the smallest to the largest.",dir:"SMALLEST → LARGEST",opts:{A:"53",B:"35",C:"54",D:"45"},ans:"BDAC",explain:[["B","35"],["D","45"],["A","53"],["C","54"]]},
  {n:2,cat:"MATHS",prompt:"Arrange these fractions from the largest to the smallest.",dir:"LARGEST → SMALLEST",opts:{A:"1/4",B:"3/4",C:"1/3",D:"1/2"},ans:"BDCA",explain:[["B","3/4 = 0.75"],["D","1/2 = 0.50"],["C","1/3 = 0.33"],["A","1/4 = 0.25"]]},
  {n:3,cat:"MATHS",prompt:"Arrange these values from the smallest to the largest.",dir:"SMALLEST → LARGEST",opts:{A:"5²",B:"3²",C:"2³",D:"4²"},ans:"CBDA",explain:[["C","2³ = 8"],["B","3² = 9"],["D","4² = 16"],["A","5² = 25"]]},
  {n:4,cat:"MATHS",prompt:"Arrange these decimal numbers from the largest to the smallest.",dir:"LARGEST → SMALLEST",opts:{A:"0.505",B:"0.05",C:"0.55",D:"0.5"},ans:"CADB",explain:[["C","0.55"],["A","0.505"],["D","0.5"],["B","0.05"]]},
  {n:5,cat:"MATHS",prompt:"Arrange these answers from the smallest to the largest.",dir:"SMALLEST → LARGEST",opts:{A:"25% of 200",B:"One-third of 90",C:"Half of 80",D:"15% of 400"},ans:"BCAD",explain:[["B","One-third of 90 = 30"],["C","Half of 80 = 40"],["A","25% of 200 = 50"],["D","15% of 400 = 60"]]},
  {n:6,cat:"POLITICS",prompt:"Arrange these Prime Ministers of India in the order in which they first took office.",dir:"EARLIEST → LATEST",opts:{A:"Indira Gandhi",B:"Rajiv Gandhi",C:"Jawaharlal Nehru",D:"Dr. Manmohan Singh"},ans:"CABD",explain:[["C","Jawaharlal Nehru – 1947"],["A","Indira Gandhi – 1966"],["B","Rajiv Gandhi – 1984"],["D","Dr. Manmohan Singh – 2004"]]},
  {n:7,cat:"POLITICS",prompt:"Arrange these Presidents of India in the order in which they took office.",dir:"EARLIEST → LATEST",opts:{A:"Dr. A. P. J. Abdul Kalam",B:"Dr. Rajendra Prasad",C:"Droupadi Murmu",D:"Pratibha Patil"},ans:"BADC",explain:[["B","Dr. Rajendra Prasad – 1950"],["A","Dr. A. P. J. Abdul Kalam – 2002"],["D","Pratibha Patil – 2007"],["C","Droupadi Murmu – 2022"]]},
  {n:8,cat:"POLITICS",prompt:"Arrange these in increasing order of the minimum age required in India.",dir:"LOWEST → HIGHEST AGE",opts:{A:"To vote in an election",B:"To become President",C:"To become a Rajya Sabha member",D:"To become a Lok Sabha member"},ans:"ADCB",explain:[["A","To vote – 18 years"],["D","Lok Sabha member – 25 years"],["C","Rajya Sabha member – 30 years"],["B","President – 35 years"]]},
  {n:9,cat:"POLITICS",prompt:"Arrange these states in decreasing order of the number of Lok Sabha seats.",dir:"MOST → FEWEST SEATS",opts:{A:"Uttar Pradesh",B:"Bihar",C:"Maharashtra",D:"West Bengal"},ans:"ACDB",explain:[["A","Uttar Pradesh – 80"],["C","Maharashtra – 48"],["D","West Bengal – 42"],["B","Bihar – 40"]]},
  {n:10,cat:"POLITICS",prompt:"Arrange these offices from highest to lowest in the Indian order of precedence.",dir:"HIGHEST → LOWEST",opts:{A:"Prime Minister",B:"Chief Justice of India",C:"President",D:"Vice-President"},ans:"CDAB",explain:[["C","President – rank 1"],["D","Vice-President – rank 2"],["A","Prime Minister – rank 3"],["B","Chief Justice of India – rank 7"]]},
  {n:11,cat:"SPORTS",prompt:"Arrange these games in increasing order of players per team on the field.",dir:"FEWEST → MOST PLAYERS",opts:{A:"Cricket",B:"Volleyball",C:"Basketball",D:"Kabaddi"},ans:"CBDA",explain:[["C","Basketball – 5"],["B","Volleyball – 6"],["D","Kabaddi – 7"],["A","Cricket – 11"]]},
  {n:12,cat:"SPORTS",prompt:"Arrange these Indian cricketers by the year of their international debut.",dir:"EARLIEST → LATEST",opts:{A:"Virat Kohli",B:"Sachin Tendulkar",C:"Rohit Sharma",D:"MS Dhoni"},ans:"BDCA",explain:[["B","Sachin Tendulkar – 1989"],["D","MS Dhoni – 2004"],["C","Rohit Sharma – 2007"],["A","Virat Kohli – 2008"]]},
  {n:13,cat:"SPORTS",prompt:"Arrange these Indian World Cup triumphs in chronological order.",dir:"EARLIEST → LATEST",opts:{A:"T20 World Cup win in Johannesburg",B:"Cricket World Cup win at Lord's",C:"T20 World Cup win in Barbados",D:"Cricket World Cup win at Wankhede"},ans:"BADC",explain:[["B","Cricket World Cup at Lord's – 1983"],["A","T20 World Cup in Johannesburg – 2007"],["D","Cricket World Cup at Wankhede – 2011"],["C","T20 World Cup in Barbados – 2024"]]},
  {n:14,cat:"SCIENCE",prompt:"Arrange these planets in increasing order of distance from the Sun.",dir:"NEAREST → FARTHEST",opts:{A:"Mars",B:"Mercury",C:"Earth",D:"Venus"},ans:"BDCA",explain:[["B","Mercury – 1st planet"],["D","Venus – 2nd planet"],["C","Earth – 3rd planet"],["A","Mars – 4th planet"]]},
  {n:15,cat:"SCIENCE",prompt:"Arrange these planets in decreasing order of size.",dir:"LARGEST → SMALLEST",opts:{A:"Uranus",B:"Saturn",C:"Neptune",D:"Jupiter"},ans:"DBAC",explain:[["D","Jupiter – largest planet"],["B","Saturn – second largest"],["A","Uranus – third largest"],["C","Neptune – fourth largest"]]},
  {n:16,cat:"GK",prompt:"Arrange these structures in increasing order of height.",dir:"SHORTEST → TALLEST",opts:{A:"Statue of Unity",B:"Burj Khalifa",C:"Qutub Minar",D:"Eiffel Tower"},ans:"CADB",explain:[["C","Qutub Minar – about 73 m"],["A","Statue of Unity – 182 m"],["D","Eiffel Tower – about 330 m"],["B","Burj Khalifa – 828 m"]]},
  {n:17,cat:"GK",prompt:"Arrange these animals in decreasing order of top running speed.",dir:"FASTEST → SLOWEST",opts:{A:"Elephant",B:"Horse",C:"Cheetah",D:"Lion"},ans:"CDBA",explain:[["C","Cheetah – about 110 km/h"],["D","Lion – about 80 km/h"],["B","Horse – about 70 km/h"],["A","Elephant – about 40 km/h"]]},
  {n:18,cat:"GK",prompt:"Arrange these Indian states in decreasing order of area.",dir:"LARGEST → SMALLEST",opts:{A:"Uttar Pradesh",B:"Rajasthan",C:"Maharashtra",D:"Madhya Pradesh"},ans:"BDCA",explain:[["B","Rajasthan – largest state"],["D","Madhya Pradesh – second largest"],["C","Maharashtra – third largest"],["A","Uttar Pradesh – fourth largest"]]},
  {n:19,cat:"GK",prompt:"Arrange these oceans in decreasing order of size.",dir:"LARGEST → SMALLEST",opts:{A:"Arctic Ocean",B:"Indian Ocean",C:"Atlantic Ocean",D:"Pacific Ocean"},ans:"DCBA",explain:[["D","Pacific Ocean – largest"],["C","Atlantic Ocean – second largest"],["B","Indian Ocean – third largest"],["A","Arctic Ocean – smallest"]]},
  {n:20,cat:"HISTORY",prompt:"Arrange these Mughal emperors in the order in which they ruled.",dir:"EARLIEST → LATEST",opts:{A:"Akbar",B:"Babur",C:"Shah Jahan",D:"Jahangir"},ans:"BADC",explain:[["B","Babur – from 1526"],["A","Akbar – from 1556"],["D","Jahangir – from 1605"],["C","Shah Jahan – from 1628"]]},
  {n:21,cat:"GK",prompt:"Arrange these Indian rivers in decreasing order of length.",dir:"LONGEST → SHORTEST",opts:{A:"Ganga",B:"Krishna",C:"Godavari",D:"Narmada"},ans:"ACBD",explain:[["A","Ganga – about 2,525 km"],["C","Godavari – about 1,465 km"],["B","Krishna – about 1,400 km"],["D","Narmada – about 1,312 km"]]}
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
    answers: {},            // token -> {order:[], submitted, submitTime}
    questionStart: 0,
    roundActive: false,
    roundTimer: null,
    honour: [],              // {round, cat, team, name, timeMs}
    lastQuestionPayload: null,
    lastResultsPayload: null,
    lastFinalPayload: null,
    phase: 'lobby'           // lobby | question | results | final
  };
}

function publicPlayers(){
  return game.players.map(p => ({ id: p.id, team: p.team, name: p.name, active: p.active }));
}

function lobbySnapshot(){
  return { phase: 'lobby', pin: game.pin, gameId: game.id, players: publicPlayers(), started: game.started };
}

function snapshotForNewConnection(){
  if (!game) return { phase: 'no-game' };
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

function nextQuestion(){
  if (!game) return;
  clearTimeout(game.roundTimer);
  game.qIndex++;
  const remaining = game.players.filter(p => p.active).length;
  if (game.qIndex >= QUESTIONS.length || remaining <= 1){
    game.phase = 'final';
    const payload = { honour: game.honour, stillStanding: game.players.filter(p => p.active).map(p => ({team:p.team, name:p.name})) };
    game.lastFinalPayload = payload;
    io.emit('game:final', payload);
    return;
  }
  game.answers = {};
  game.questionStart = Date.now();
  game.roundActive = true;
  game.phase = 'question';
  const payload = { q: freshQuestionForClient(game.qIndex), qNum: game.qIndex + 1, total: QUESTIONS.length, activeCount: remaining, startedAt: game.questionStart, roundMs: ROUND_MS };
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
    isLastRound: (game.qIndex + 1 >= QUESTIONS.length) || (game.players.filter(p => p.active).length <= 1)
  };
  game.lastResultsPayload = payload;
  io.emit('round:results', payload);
}

io.on('connection', (socket) => {
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
    broadcastLobby();
  });

  socket.on('player:join', ({ team, name, pin, token } = {}, ack) => {
    if (!game){ if (typeof ack === 'function') ack({ ok: false, reason: 'no_game' }); return; }
    if (game.started){ if (typeof ack === 'function') ack({ ok: false, reason: 'already_started' }); return; }
    team = String(team || '').trim().slice(0, 20);
    name = String(name || '').trim().slice(0, 30);
    pin = String(pin || '').trim();
    token = String(token || '').trim().slice(0, 64) || genId();
    if (!team || !name){ if (typeof ack === 'function') ack({ ok: false, reason: 'missing_fields' }); return; }
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
    io.emit('game:started');
    nextQuestion();
  });

  socket.on('host:nextQuestion', () => { nextQuestion(); });
  socket.on('host:endRoundNow', () => { endRound(); });

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
