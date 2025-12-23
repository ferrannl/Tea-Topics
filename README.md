<p align="center">
  <a href="https://ferrannl.github.io/Tea-Topics/">
    <img src="logo.png" alt="Tea Topics Logo" width="180">
  </a>
</p>

<h1 align="center">🍵 Tea Topics</h1>

<p align="center">
  <strong>Cozy conversation starters in swinging tea tags.</strong><br>
  Perfect for dates, parties, family nights or just vibing.
</p>

<p align="center">
  <a href="https://ferrannl.github.io/Tea-Topics/">🌍 Live Demo</a>
</p>

---

## ✨ What is Tea Topics?

**Tea Topics** is a small, playful web app that shows random conversation starters  
in **cute hanging cards** that gently **swing like tea tags** ☕🪢

Minimal. Cozy. No accounts. No clutter.  
Just good questions and good conversations.

Made with ❤️ by **Ferran**

---

## 🚀 Features

- 🪢 **Hanging tag cards** with smooth swing animation  
- 📱 **Fully responsive** (mobile, tablet & desktop)
- 🎲 **Fullscreen Random Mode**
  - Click card or press **Space** → next
  - **← / →** → previous / next
  - **Esc** → exit fullscreen
- 📄 **Pagination**
  - Subtle progress bar
  - Green pill indicator that slides per page
- 🔍 **Card modal (home screen)**
  - 📋 Copy topic to clipboard
  - 🖼️ Save card as PNG (via `html2canvas`)
- 🎨 Clean, calm, “tea-ish” design

---

## 🗂️ Project Structure

```

.
├─ index.html
├─ style.css
├─ app.js
├─ topics.json
├─ logo.png                 (optional)
├─ favicon.ico
├─ favicon-16x16.png
├─ favicon-32x32.png
├─ apple-touch-icon.png
├─ android-chrome-192x192.png
├─ android-chrome-512x512.png
└─ site.webmanifest

````

---

## 📝 Topics Format

Edit **`topics.json`** to add your own Tea Topics.  
The app supports **two formats**:

### ✅ Format A — Structured (recommended)

```json
{
  "topics": [
    { "text": "Wat is een onverwachte guilty pleasure van jou?", "category": "Fun" },
    { "text": "Welke film kun je 10x kijken zonder te vervelen?", "category": "Movies" },
    { "text": "Wat is iets dat je nog écht wilt doen dit jaar?", "category": "Life" }
  ]
}
````

### ✅ Format B — Plain list (legacy)

```json
{
  "topicsRaw": "Wat is jouw favoriete eten?\nWaar ben je trots op?\nWat is je beste herinnering?"
}
```

**Tips**

* Gebruik bij voorkeur een `?` (de app filtert echte vragen)
* Short & spicy works best 🌶️

---

## ▶️ Run Locally

Because this project loads `topics.json`, it must be served via a local server
(`file://` will not work).

### VS Code (easy mode)

Install **Live Server**
→ right-click `index.html`
→ **Open with Live Server**

### Python

```bash
python -m http.server 8080
```

Open in your browser:

```
http://localhost:8080
```

---

## 🎮 Controls

### Home Screen

* Click a card → opens modal
* Copy or save the topic as PNG

### Fullscreen Mode

* **Click card** or **Space** → next topic
* **← / →** → previous / next
* **Esc** → close fullscreen

---

## 🖼️ Save as Image

The **Save** button uses:

* `html2canvas` (CDN)

It exports the card as a PNG — perfect for
WhatsApp, Instagram stories, or sharing with friends.

---

## 🧠 Technical Notes

* Swing animation is re-triggered after renders
  (prevents “sometimes it doesn’t swing” issues)
* Copy & Save buttons are **disabled in fullscreen** by design
  (fullscreen = distraction-free)

---

## 🧑‍💻 Credits

* Fonts: **Pacifico** & **Nunito** (Google Fonts)
* Icons: **Font Awesome**
* Image export: **html2canvas**

---

## 🔗 Links

* 🌍 Live demo: [https://ferrannl.github.io/Tea-Topics/](https://ferrannl.github.io/Tea-Topics/)
* 🧠 Source code: [https://github.com/ferrannl/Tea-Topics](https://github.com/ferrannl/Tea-Topics)

---

☕ Enjoy the conversations.

```

---

```
