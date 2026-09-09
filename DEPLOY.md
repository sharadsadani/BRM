# Putting the game online (free, ~10 minutes, no credit card)

You only need to do this once before the event. It gives you one permanent link that works for you (the host) and every player, over any internet connection — no local WiFi needed.

We'll use **GitHub** to hold the code and **Render** to run it (Render's free tier needs no credit card and supports the live connection this game uses).

## Step 1 — Put the code on GitHub

1. Go to [github.com](https://github.com) and sign up for a free account if you don't have one.
2. Click the **+** in the top right → **New repository**.
3. Name it `fastest-finger-first`, leave it **Public**, don't add a README (you already have one), then click **Create repository**.
4. On the new (empty) repo page, click **uploading an existing file**.
5. Drag in every file from the `fastest-finger-app` folder you downloaded — including the `public` folder with `index.html` inside it, `server.js`, `package.json`, `.gitignore`, `README.md`. (Do not upload a `node_modules` folder if one exists on your computer — you shouldn't have one unless you ran `npm install` locally.)
6. Scroll down and click **Commit changes**.

## Step 2 — Deploy it on Render

1. Go to [render.com](https://render.com) and sign up for free (no credit card needed).
2. Click **New +** → **Web Service**.
3. Choose **Public Git repository** and paste your GitHub repo's URL (something like `https://github.com/yourname/fastest-finger-first`).
4. Render should auto-detect it's a Node app. Fill in:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Choose the **Free** instance type.
6. Click **Create Web Service**.

Render will build and start it — this takes 1–2 minutes the first time. When it's done, you'll see a live URL at the top like:

```
https://fastest-finger-first-XXXX.onrender.com
```

**That URL is your game.** Open it, choose "I'm the Host," and you're ready to go. Send the same URL to your players — they choose "I'm a Player."

## Good to know before the event

- **Wake it up early.** Render's free tier "sleeps" a service after 15 minutes with no visitors, and takes about a minute to wake back up on the next visit. Open your host link a few minutes before the event starts so it's already awake, and it'll stay awake as long as people keep using it.
- **One game at a time.** The app holds the current game (PIN, roster, scores) in memory, not a database — perfect for a single event, but if the server restarts mid-game (very unlikely once it's awake and being used), everyone would need to rejoin with a fresh PIN.
- **Updating later.** If you ever want to change a question or tweak the design, edit the files in your GitHub repo (GitHub's web editor works fine for small edits) — Render redeploys automatically within a minute or two of a change.
