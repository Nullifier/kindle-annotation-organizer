/* ============================================================
   Kindle Clippings Organizer — app.js
   ============================================================ */

(function () {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  var SEPARATOR = '==========';

  var RU_MONTHS = {
    'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
    'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
    'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11
  };

  // ── State ──────────────────────────────────────────────────
  var state = {
    books:          null,  // Map<string, Book>
    bookList:       [],    // Book[] sorted by count desc
    activeBookKey:  null
  };

  // ── Parser ─────────────────────────────────────────────────

  function stripBOM(str) {
    return str.replace(/^\uFEFF/, '');
  }

  function parseDate(str) {
    if (!str) return null;

    // English locale strings parse natively
    var d = new Date(str);
    if (!isNaN(d.getTime())) return d;

    // Russian: "понедельник, 12 августа 2024 г. в 16:26:21"
    var ruMatch = str.match(
      /(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)\s+(\d{4}).*?(\d{1,2}):(\d{2}):(\d{2})/
    );
    if (ruMatch) {
      return new Date(
        parseInt(ruMatch[3], 10),
        RU_MONTHS[ruMatch[2]],
        parseInt(ruMatch[1], 10),
        parseInt(ruMatch[4], 10),
        parseInt(ruMatch[5], 10),
        parseInt(ruMatch[6], 10)
      );
    }

    return null;
  }

  function formatDate(d) {
    if (!d) return '';
    var months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function parseMeta(line) {
    if (!line) return null;

    var type = 'highlight', page = null, location = null, dateRaw = null;

    // English — Highlight
    var m = line.match(
      /^[-–]\s+Your Highlight(?:\s+on\s+(?:page\s+([\d\-]+)|Location\s+([\d\-]+)))?(?:\s*\|\s*Location\s+([\d\-]+))?\s*\|\s*Added on\s+(.+)$/i
    );
    if (m) {
      page = m[1] || null;
      location = m[3] || m[2] || null;
      dateRaw = m[4] ? m[4].trim() : null;
    }

    // English — Note
    if (!m) {
      m = line.match(
        /^[-–]\s+Your Note(?:\s+on\s+(?:page\s+([\d\-]+)|Location\s+([\d\-]+)))?(?:\s*\|\s*Location\s+([\d\-]+))?\s*\|\s*Added on\s+(.+)$/i
      );
      if (m) {
        page = m[1] || null;
        location = m[3] || m[2] || null;
        dateRaw = m[4] ? m[4].trim() : null;
        type = 'note';
      }
    }

    // Russian — Highlight
    if (!m) {
      m = line.match(
        /^[-–]\s+Ваш выделенный отрывок на странице\s+([\d\-]+)(?:\s*\|\s*Место\s+([\d–\-]+))?\s*\|\s*Добавлено:\s+(.+)$/
      );
      if (m) {
        page = m[1] || null;
        location = m[2] || null;
        dateRaw = m[3] ? m[3].trim() : null;
      }
    }

    // Russian — Note
    if (!m) {
      m = line.match(
        /^[-–]\s+Ваша заметка на странице\s+([\d\-]+)(?:\s*\|\s*Место\s+([\d–\-]+))?\s*\|\s*Добавлено:\s+(.+)$/
      );
      if (m) {
        page = m[1] || null;
        location = m[2] || null;
        dateRaw = m[3] ? m[3].trim() : null;
        type = 'note';
      }
    }

    var date = parseDate(dateRaw);
    return { type: type, page: page, location: location, date: date, dateDisplay: formatDate(date) };
  }

  function parseTitle(raw) {
    var titleRaw = stripBOM(raw).trim();
    var authorMatch = titleRaw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    var title, author;
    if (authorMatch) {
      title  = authorMatch[1].trim();
      author = authorMatch[2].trim();
    } else {
      var dashMatch = titleRaw.match(/^(.*?)\s*-\s*Unknown\s*$/i);
      title  = dashMatch ? dashMatch[1].trim() : titleRaw;
      author = null;
    }
    return { key: titleRaw, title: title || titleRaw, author: author };
  }

  function parseEntry(raw, index) {
    var lines = raw.split('\n');
    if (lines.length < 2) return null;
    var titleInfo = parseTitle(lines[0]);
    var meta      = parseMeta(lines[1]);
    var text      = lines.slice(3).join('\n').trim();
    if (!text || !meta) return null;
    return {
      id:          titleInfo.key + '-' + index,
      type:        meta.type,
      text:        text,
      page:        meta.page,
      location:    meta.location,
      date:        meta.date,
      dateDisplay: meta.dateDisplay,
      bookKey:     titleInfo.key,
      bookTitle:   titleInfo.title,
      bookAuthor:  titleInfo.author
    };
  }

  function parseClippings(text) {
    text = stripBOM(text);
    var rawEntries = text.split(SEPARATOR)
      .map(function (e) { return e.trim(); })
      .filter(function (e) { return e.length > 0; });

    var books = new Map();

    rawEntries.forEach(function (raw, i) {
      var highlight = parseEntry(raw, i);
      if (!highlight) return;
      var key = highlight.bookKey;
      if (!books.has(key)) {
        books.set(key, { key: key, title: highlight.bookTitle,
          author: highlight.bookAuthor, highlights: [], count: 0, lastDate: null });
      }
      var book = books.get(key);
      book.highlights.push(highlight);
      book.count++;
      if (highlight.date && (!book.lastDate || highlight.date > book.lastDate)) {
        book.lastDate = highlight.date;
      }
    });

    books.forEach(function (book) {
      book.highlights.sort(function (a, b) {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date - b.date;
      });
    });

    var bookList = Array.from(books.values()).sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count;
      return a.title.localeCompare(b.title);
    });

    return { books: books, bookList: bookList };
  }

  // ── Render ─────────────────────────────────────────────────

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatLocation(hl) {
    var parts = [];
    if (hl.page)     parts.push('Page\u00a0' + hl.page);
    if (hl.location) parts.push('Loc.\u00a0' + hl.location);
    return parts.join(' \u00b7 ');
  }

  function renderBookDropdown() {
    var select = document.getElementById('book-select');
    var frag   = document.createDocumentFragment();

    var defaultOpt       = document.createElement('option');
    defaultOpt.value     = '';
    defaultOpt.textContent = '— Select a book —';
    frag.appendChild(defaultOpt);

    state.bookList.forEach(function (book) {
      var opt   = document.createElement('option');
      opt.value = book.key;
      var label = book.title;
      if (book.author) label += ' \u2014 ' + book.author;
      label += ' (' + book.count + ')';
      opt.textContent = label;
      frag.appendChild(opt);
    });

    select.replaceChildren(frag);
  }

  function renderHighlights(book) {
    // Update book info bar
    document.getElementById('content-title').textContent  = book.title;
    document.getElementById('content-author').textContent = book.author || '';
    document.getElementById('content-count').textContent  =
      book.count + (book.count === 1 ? ' highlight' : ' highlights');
    document.getElementById('book-header').hidden = false;

    // Hide placeholder
    var placeholder = document.getElementById('content-placeholder');
    if (placeholder) placeholder.hidden = true;

    // Render cards
    var list = document.getElementById('highlights-list');
    var frag = document.createDocumentFragment();

    book.highlights.forEach(function (hl) {
      var article       = document.createElement('article');
      article.className = 'highlight-card' + (hl.type === 'note' ? ' type-note' : '');
      var locStr        = formatLocation(hl);
      var noteBadge     = hl.type === 'note' ? '<span class="note-badge">Note</span>' : '';

      article.innerHTML =
        '<div class="highlight-meta">' +
          '<span class="meta-location">' + escapeHtml(locStr) + '</span>' +
          '<span class="meta-right">' + noteBadge +
            '<span class="meta-date">' + escapeHtml(hl.dateDisplay) + '</span>' +
          '</span>' +
        '</div>' +
        '<p class="highlight-text">' + escapeHtml(hl.text) + '</p>';

      frag.appendChild(article);
    });

    list.replaceChildren(frag);
    list.scrollTop = 0;
  }

  function selectBook(key) {
    state.activeBookKey = key;
    document.getElementById('book-select').value = key;
    var book = state.books.get(key);
    if (book) renderHighlights(book);
  }

  // ── File Handling ──────────────────────────────────────────

  function handleFile(file) {
    if (!file) return;
    var reader  = new FileReader();
    reader.onload = function (e) {
      var result          = parseClippings(e.target.result);
      state.books         = result.books;
      state.bookList      = result.bookList;
      state.activeBookKey = null;

      renderBookDropdown();

      document.getElementById('upload-screen').hidden = true;
      document.getElementById('app').hidden           = false;
      document.getElementById('book-header').hidden   = true;

      // Auto-select first book
      if (state.bookList.length > 0) {
        selectBook(state.bookList[0].key);
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function resetApp() {
    state.books         = null;
    state.bookList      = [];
    state.activeBookKey = null;

    document.getElementById('app').hidden           = true;
    document.getElementById('upload-screen').hidden = false;
    document.getElementById('file-input').value     = '';
  }

  // ── Drag & Drop ────────────────────────────────────────────

  function setupDragDrop() {
    var uploadZone  = document.getElementById('upload-zone');
    var dropOverlay = document.getElementById('drop-overlay');
    var dragCounter = 0;

    uploadZone.addEventListener('dragover', function (e) {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
    uploadZone.addEventListener('dragleave', function () {
      uploadZone.classList.remove('drag-over');
    });
    uploadZone.addEventListener('drop', function (e) {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      dropOverlay.classList.remove('active');
      dragCounter = 0;
      var file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    document.addEventListener('dragenter', function (e) {
      e.preventDefault();
      dragCounter++;
      dropOverlay.classList.add('active');
    });
    document.addEventListener('dragleave', function () {
      dragCounter--;
      if (dragCounter <= 0) { dragCounter = 0; dropOverlay.classList.remove('active'); }
    });
    document.addEventListener('dragover', function (e) { e.preventDefault(); });
    document.addEventListener('drop', function (e) {
      e.preventDefault();
      dragCounter = 0;
      dropOverlay.classList.remove('active');
      var file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
  }

  // ── Init ───────────────────────────────────────────────────

  function init() {
    setupDragDrop();

    var fileInput = document.getElementById('file-input');

    document.getElementById('browse-btn').addEventListener('click', function () {
      fileInput.click();
    });
    document.getElementById('upload-zone').addEventListener('click', function (e) {
      if (e.target.id !== 'browse-btn') fileInput.click();
    });
    fileInput.addEventListener('change', function (e) {
      if (e.target.files[0]) handleFile(e.target.files[0]);
    });

    document.getElementById('load-new-btn').addEventListener('click', resetApp);

    document.getElementById('book-select').addEventListener('change', function (e) {
      if (e.target.value) selectBook(e.target.value);
    });
  }

  document.addEventListener('DOMContentLoaded', init);

})();
