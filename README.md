# Kindle Annotation Organizer

A lightweight, browser-based viewer for your Kindle highlights and notes. Drop in your `My Clippings.txt` file and browse everything you've highlighted — organized by book, with dates and locations — without installing anything or sending your data anywhere.

---

## Features

- **No setup** — open `index.html` directly in your browser, no server needed
- **Private** — your file is processed entirely in your browser, nothing is uploaded
- **Book dropdown** — all books listed by highlight count, pick one to view its highlights
- **Rich metadata** — each highlight shows its page, location, and the date you made it
- **Notes support** — Kindle notes are displayed separately from highlights with a distinct style
- **Multilingual** — handles both English and Russian Kindle metadata formats
- **Responsive** — works on mobile too

---

## How to Use

### 1. Export your Kindle clippings

Connect your Kindle to your computer via USB. Open the Kindle drive and find the file:

```
/Volumes/Kindle/documents/My Clippings.txt   (Mac)
D:\documents\My Clippings.txt                (Windows)
```

Copy `My Clippings.txt` somewhere on your computer.

### 2. Open the app

Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge). You can double-click the file or drag it into a browser window.

### 3. Load your clippings

On the upload screen, either:
- **Drag and drop** `My Clippings.txt` anywhere on the page, or
- **Click** the upload zone (or the "browse to choose" link) to pick the file

The file is parsed instantly — no loading spinner, no wait.

### 4. Browse your highlights

After loading, the app shows:

- A **dropdown at the top** listing all your books, sorted by number of highlights. Each entry shows the title, author, and count.
- Select a book to see all its highlights in reading order.
- Each highlight card shows the **page/location** and **date** it was made.
- **Notes** you wrote on your Kindle appear with a yellow tint and a "Note" badge.

### 5. Load a different file

Click **"Load file"** in the top bar to return to the upload screen and load a new file.

---

## Files

```
index.html   — open this in your browser
app.js       — clippings parser and all UI logic
styles.css   — styling
```

No build step, no dependencies, no package.json.

---

## Supported Clippings Format

The app parses the standard Kindle clippings format:

```
Book Title (Author Name)
- Your Highlight on page 4 | Location 59-63 | Added on Friday, August 9, 2024 6:50:58 AM

Highlighted text goes here.
==========
```

It handles:
- Highlights and notes
- Page numbers, location numbers, or both
- English and Russian Kindle interface languages
- Multiple authors (separated by semicolons)
- Multi-paragraph highlights
