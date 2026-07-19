(function () {
  "use strict";

  const el = (tag, cls, attrs) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };

  function symSpan(ch) {
    const s = el("span", "zfont");
    s.textContent = ch;
    return s;
  }

  function setHoverData(node, { letter, cipher, sym }) {
    node.classList.add("hoverable");
    if (letter) node.dataset.letter = letter;
    if (cipher) node.dataset.cipher = cipher;
    if (sym) node.dataset.sym = sym;
  }

  // ---------------- Table 1 (by plaintext letter) ----------------
  function buildTable1() {
    const root = document.getElementById("table1");
    root.innerHTML = "";
    const maxZ408 = Math.max(...DATA.lettersOrder.map(l => (DATA.letters408[l] || []).length));
    const maxZ340 = Math.max(...DATA.lettersOrder.map(l => (DATA.letters340[l] || []).length));

    DATA.lettersOrder.forEach((letter) => {
      const col = el("div", "t1-col");

      const letterCell = el("div", "t1-letter");
      letterCell.textContent = letter;
      setHoverData(letterCell, { letter });
      col.appendChild(letterCell);

      const list408 = DATA.letters408[letter] || [];
      for (let i = 0; i < maxZ408; i++) {
        const cell = el("div", "t1-symrow z408");
        const ch = list408[i];
        if (ch) {
          const span = symSpan(ch);
          setHoverData(span, { letter, cipher: "z408", sym: ch });
          cell.appendChild(span);
        }
        col.appendChild(cell);
      }

      col.appendChild(el("div", "t1-group-gap"));
      const list340 = DATA.letters340[letter] || [];
      for (let i = 0; i < maxZ340; i++) {
        const cell = el("div", "t1-symrow z340");
        const ch = list340[i];
        if (ch) {
          const span = symSpan(ch);
          setHoverData(span, { letter, cipher: "z340", sym: ch });
          cell.appendChild(span);
        }
        col.appendChild(cell);
      }

      root.appendChild(col);
    });
  }

  // ---------------- Table 2 (by cipher symbol) ----------------
  const MATCH_SET = new Set(DATA.matches);

  function buildTable2() {
    const root = document.getElementById("table2");
    root.innerHTML = "";
    DATA.symbols.forEach(entry => {
      const col = el("div", "t2-col");
      const isMatch = MATCH_SET.has(entry.sym);

      const symCell = el("div", "t2-symcell");
      const span = symSpan(entry.sym);
      setHoverData(span, { sym: entry.sym });
      if (isMatch) symCell.dataset.match = "1";
      symCell.appendChild(span);
      col.appendChild(symCell);

      const row408 = el("div", "t2-letter z408");
      if (entry.letter408) {
        row408.textContent = entry.letter408;
        setHoverData(row408, { letter: entry.letter408, cipher: "z408", sym: entry.sym });
        if (isMatch) row408.dataset.match = "1";
      }
      col.appendChild(row408);

      const row340 = el("div", "t2-letter z340");
      if (entry.letter340) {
        row340.textContent = entry.letter340;
        setHoverData(row340, { letter: entry.letter340, cipher: "z340", sym: entry.sym });
        if (isMatch) row340.dataset.match = "1";
      }
      col.appendChild(row340);

      root.appendChild(col);
    });
  }

  // ---------------- Cipher preview ----------------
  const CIPHER_DATA = { z408: DATA.cipher408, z340: DATA.cipher340, z340u: DATA.cipher340u };
  const CIPHER_LABEL = { z408: "Z408", z340: "Z340", z340u: "Z340 (untransposed)" };
  const state = { cipher: "z408", view: "cipher" };

  function buildPreview() {
    const grid = document.getElementById("previewGrid");
    const data = CIPHER_DATA[state.cipher];
    grid.style.gridTemplateColumns = `repeat(${data.cols}, 24px)`;
    grid.innerHTML = "";
    data.grid.forEach(row => {
      row.forEach(cellData => {
        const cell = el("div", "pg-cell");
        if (typeof cellData.w === "number") {
          cell.classList.add(cellData.w % 2 === 0 ? "word-a" : "word-b");
        }
        if (state.view === "cipher") {
          cell.classList.add("zfont");
          cell.textContent = cellData.sym;
          setHoverData(cell, { letter: cellData.letter, cipher: state.cipher === "z340u" ? "z340" : state.cipher, sym: cellData.sym });
        } else {
          cell.textContent = cellData.letter;
          setHoverData(cell, { letter: cellData.letter, cipher: state.cipher === "z340u" ? "z340" : state.cipher, sym: cellData.sym });
        }
        grid.appendChild(cell);
      });
    });
    document.getElementById("previewNote").textContent =
      `${CIPHER_LABEL[state.cipher]} — ${data.cols * data.rows} characters — ` +
      `showing ${state.view === "cipher" ? "cipher symbols" : "plaintext letters"}.`;
  }

  function wireToggle(containerId, attr, onChange) {
    const container = document.getElementById(containerId);
    container.addEventListener("click", e => {
      const btn = e.target.closest(".toggle-btn");
      if (!btn) return;
      container.querySelectorAll(".toggle-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      onChange(btn.dataset[attr]);
    });
  }

  // ---------------- Hover linking ----------------
  function allHoverables() {
    return document.querySelectorAll(".hoverable");
  }

  function computeMatches(hoveredEl) {
    const sym = hoveredEl.dataset.sym || null;
    const letter = hoveredEl.dataset.letter || null;
    const cipher = hoveredEl.dataset.cipher || null;

    const letterMatches = (elm) => {
      if (!letter || elm.dataset.letter !== letter) return false;
      const elCipher = elm.dataset.cipher || null;
      return !cipher || !elCipher || cipher === elCipher;
    };

    const matches = [];
    allHoverables().forEach(elm => {
      const elSym = elm.dataset.sym || null;
      let hit;
      if (elSym) {
        // Target is a specific symbol instance: only an exact glyph match counts,
        // unless the hovered element itself is a plain letter (no symbol) - then
        // hovering a letter should surface every symbol that spells it.
        hit = sym ? elSym === sym : letterMatches(elm);
      } else {
        hit = letterMatches(elm);
      }
      if (hit) matches.push(elm);
    });
    return matches;
  }

  function onEnter(e) {
    const target = e.target.closest(".hoverable");
    if (!target) return;
    computeMatches(target).forEach(elm => elm.classList.add("hl"));
    updateStats(target);
  }

  function onLeave(e) {
    const target = e.target.closest(".hoverable");
    if (!target) return;
    document.querySelectorAll(".hl").forEach(elm => elm.classList.remove("hl"));
  }

  function wireHoverDelegation() {
    document.body.addEventListener("mouseover", onEnter);
    document.body.addEventListener("mouseout", onLeave);
  }

  // ---------------- Stats panel ----------------
  const SYMBOL_BY_CHAR = new Map(DATA.symbols.map(s => [s.sym, s]));

  function chip(ch, count) {
    const c = el("span", "chip");
    c.appendChild(symSpan(ch));
    const n = el("span", "count");
    n.textContent = `×${count}`;
    c.appendChild(n);
    return c;
  }

  function statsRowForLetter(cipherKey, cipherLabel, letter) {
    const list = (cipherKey === "z408" ? DATA.letters408 : DATA.letters340)[letter] || [];
    const counts = cipherKey === "z408" ? DATA.counts408 : DATA.counts340;
    const row = el("div", "stats-row");
    const label = el("span", `stats-label ${cipherKey}`);
    label.textContent = cipherLabel + ":";
    row.appendChild(label);
    if (!list.length) {
      const none = el("span", "count");
      none.textContent = "not used";
      row.appendChild(none);
    } else {
      list.forEach(ch => row.appendChild(chip(ch, counts[ch] || 0)));
    }
    return row;
  }

  function updateStats(hoveredEl) {
    const panel = document.getElementById("statsPanel");
    panel.innerHTML = "";

    const sym = hoveredEl.dataset.sym || null;
    const letter = hoveredEl.dataset.letter || null;

    if (sym) {
      const info = SYMBOL_BY_CHAR.get(sym) || { sym, letter408: null, letter340: null, count408: 0, count340: 0 };
      const head = el("div", "stats-row");
      const label = el("span", "stats-label");
      label.textContent = "Symbol:";
      head.appendChild(label);
      head.appendChild(chip(info.sym, info.count408 + info.count340));
      panel.appendChild(head);

      const row = el("div", "stats-row");
      const l1 = el("span", "stats-label z408");
      l1.textContent = "Z408:";
      row.appendChild(l1);
      const t1 = el("span");
      t1.textContent = info.letter408 ? `decodes to '${info.letter408}' — occurs ${info.count408}×` : "not used";
      row.appendChild(t1);
      panel.appendChild(row);

      const row2 = el("div", "stats-row");
      const l2 = el("span", "stats-label z340");
      l2.textContent = "Z340:";
      row2.appendChild(l2);
      const t2 = el("span");
      t2.textContent = info.letter340 ? `decodes to '${info.letter340}' — occurs ${info.count340}×` : "not used";
      row2.appendChild(t2);
      panel.appendChild(row2);
    } else if (letter) {
      panel.appendChild(statsRowForLetter("z408", "Z408", letter));
      panel.appendChild(statsRowForLetter("z340", "Z340", letter));
    }
  }

  // ---------------- Show matches ----------------
  let matchesActive = false;
  function wireMatchesButton() {
    const btn = document.getElementById("matchesBtn");
    btn.addEventListener("click", () => {
      matchesActive = !matchesActive;
      btn.classList.toggle("active", matchesActive);
      btn.textContent = matchesActive ? "Hide matches" : "Show matches";
      document.querySelectorAll('[data-match="1"]').forEach(elm => {
        elm.classList.toggle("matches-on", matchesActive);
      });
    });
  }

  // ---------------- Table view toggle (by letter / by symbol) ----------------
  const HINTS = {
    letter: "Hover a letter or a symbol to see where else it appears.",
    symbol: "Distinct symbols merged from both ciphers, grouped alphabetically then by shape. Rotated/flipped variants sit next to their base letter.",
  };

  function wireTableToggle() {
    const table1 = document.getElementById("table1");
    const table2 = document.getElementById("table2");
    const matchesBtn = document.getElementById("matchesBtn");
    const hint = document.getElementById("tableHint");
    wireToggle("tableToggle", "table", v => {
      const showSymbol = v === "symbol";
      table1.classList.toggle("hidden", showSymbol);
      table2.classList.toggle("hidden", !showSymbol);
      matchesBtn.classList.toggle("hidden", !showSymbol);
      hint.textContent = HINTS[v];
    });
    matchesBtn.classList.toggle("hidden", true);
    hint.textContent = HINTS.letter;
  }

  // ---------------- width lock ----------------
  // #table2 wraps 70 columns onto several lines; its unwrapped max-content width
  // would otherwise blow out the panel whenever it becomes the visible table.
  // Lock the scroll container to table1's natural width (the "by letter" view,
  // always shown first) so the panel only ever needs to be as wide as that.
  function lockTableWidth() {
    const scrollWrap = document.querySelector("#table-section .table-scroll");
    const width = document.getElementById("table1").getBoundingClientRect().width;
    // A fixed width (not just min-width) so #table2's flex-wrap is forced to
    // wrap within it instead of stretching the panel to its unwrapped size.
    scrollWrap.style.width = Math.ceil(width) + "px";
  }

  // ---------------- init ----------------
  buildTable1();
  buildTable2();
  buildPreview();
  lockTableWidth();
  wireToggle("cipherToggle", "cipher", v => { state.cipher = v; buildPreview(); });
  wireToggle("viewToggle", "view", v => { state.view = v; buildPreview(); });
  wireHoverDelegation();
  wireMatchesButton();
  wireTableToggle();
})();
