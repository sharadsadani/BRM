# Fastest Finger First

A live buzzer-round quiz for Ganesh Utsav 2026 (Shree Balaji Rajasthani Mandal). One host screen generates a PIN; players join on their own phones over the internet and the host watches the roster fill in live, then runs all 21 "arrange in order" questions with a 15-second timer, automatic scoring, and round-by-round elimination.

This is a real small web app (Node.js + Socket.IO), not a static page, because it needs a live shared connection between the host and every player's phone. See **DEPLOY.md** for how to put it online for free in about 10 minutes.

## Running it locally (optional, for testing)

```
npm install
npm start
```

Then open http://localhost:3000 in a few browser tabs to try host + player roles on one machine.

## Notes

- Game state lives in memory on the server for one event at a time. If the server restarts (e.g. the free host spins down from inactivity) mid-game, everyone needs to rejoin. Keep the host tab open and active during the event to avoid this.
- No accounts, no database, no payment required.
