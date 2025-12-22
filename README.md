<p align="center">
  <a href="https://ferrannl.github.io/Tea-Topics/">
    <img src="logo.png" alt="Tea Topics Logo" width="180">
  </a>
</p>

# 🍵 Tea Topics

A cozy little web app that shows **random “Tea Topics”** (conversation starters) in **cute hanging cards** that gently **swing** — perfect for parties, dates, family nights, or just vibing with friends.

Made with ❤️ by **Ferran**

---

## ✨ Features

- 🪢 **Hanging “tag” cards** with a smooth swinging animation
- 📱 **Responsive grid** (looks good on mobile + desktop)
- 🎲 **Fullscreen Random Mode**
  - Tap the card or press **Space** → next
  - **← / →** → previous / next
  - **Esc** → close fullscreen
- 📄 **Pagination** at the bottom
  - Subtle progress bar with a **green pill indicator** that moves per page
- 🔍 **Card modal (click a topic on the home screen)**
  - 📋 **Copy** topic text to clipboard
  - 🖼️ **Save** the card as a **PNG image** (via `html2canvas`)
- 🎨 Clean “tea-ish” styling with a soft background

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

## ✅ Getting Started

### 1) Download / clone
Put the files in one folder.

### 2) Add your topics
Edit `topics.json`.

This project supports **two formats**:

#### ✅ Format A — Array (recommended)
```json
{
  "topics": [
    { "text": "Wat is een onverwachte guilty pleasure van jou?", "category": "Fun" },
    { "text": "Welke film kun je 10x kijken zonder te vervelen?", "category": "Movies" },
    { "text": "Wat is iets dat je nog écht wilt doen dit jaar?", "category": "Life" }
  ]
}
````

#### ✅ Format B — Plain list (legacy)

```json
{
  "topicsRaw": "Wat is jouw favoriete eten?\nWaar ben je trots op?\nWat is je beste herinnering?"
}
```

> Tips:
>
> * Zet er bij voorkeur een `?` in (de app filtert op echte vragen).
> * Keep them short & spicy.

---

## ▶️ Run Locally

Because this project loads `topics.json`, you should run it with a local server (not `file://`).

### VS Code (easy)

Install **Live Server**, right click `index.html` → **Open with Live Server**.

### Or with Python

```bash
python -m http.server 8080
```

Open:
`http://localhost:8080`

---

## 🎮 Controls

### Home screen

* Click a card → opens modal with **Copy** + **Save PNG**

### Fullscreen

* **Click the card** or **Space** → next topic
* **← / →** → previous / next
* **Esc** → close fullscreen

---

## 🖼️ Saving a Card as Image

The “Save” button uses:

* `html2canvas` (loaded from CDN)

It downloads a PNG of the modal card (nice for sharing in WhatsApp / Insta / etc.).

---

## 🧠 Notes

* The swing animation is restarted after renders to prevent “sometimes it doesn’t swing”.
* Copy/Save buttons are **not shown in fullscreen** by design — only in the modal.

---

## 🧑‍💻 Credits

* Fonts: **Pacifico** + **Nunito** (Google Fonts)
* Icons: **Font Awesome**
* PNG export: **html2canvas**

````

---
