/* DoVoWorld hero demo: a looping "site scan" on a sample website. Sample data only. */
(function () {
  var root = document.querySelector('[data-sitescan]');
  if (!root) return;

  var NS = 'http://www.w3.org/2000/svg';
  var svg = root.querySelector('.ss-map');
  var beam = root.querySelector('.ss-beam');
  var promptText = root.querySelector('.ss-text');
  var goBtn = root.querySelector('.ss-go');
  var tabFix = root.querySelector('[data-tab="fixes"]');
  var tabIss = root.querySelector('[data-tab="issues"]');
  var cFix = root.querySelector('.ss-count-fixes');
  var cIss = root.querySelector('.ss-count-issues');
  var panelFix = root.querySelector('#ss-panel-fixes');
  var panelIss = root.querySelector('#ss-panel-issues');
  var rowsEl = root.querySelector('.ss-rows');
  var issEl = root.querySelector('.ss-issues');
  var emptyFix = root.querySelector('.ss-empty-fixes');
  var emptyIss = root.querySelector('.ss-empty-issues');
  var status = root.querySelector('.ss-status');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- sample site map: home, 4 sections, 4 pages each ---------- */
  var W = 400, H = 400;
  var sections = ['Shop', 'Blog', 'Guides', 'Help'];
  var tiles = [];   // {id, x, y, w, h, kind}
  tiles.push({ id: 'home', x: 165, y: 18, w: 70, h: 42, kind: 'home', label: 'Home' });
  sections.forEach(function (s, i) {
    var x = 18 + i * 96;
    tiles.push({ id: 's' + i, x: x, y: 104, w: 76, h: 40, kind: 'section', label: s });
    for (var r = 0; r < 4; r++) {
      tiles.push({ id: 's' + i + 'p' + r, x: x + 8, y: 178 + r * 52, w: 60, h: 36, kind: 'page', parent: 's' + i });
    }
  });
  function T(id) { for (var i = 0; i < tiles.length; i++) if (tiles[i].id === id) return tiles[i]; }

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  var gLines = el('g', { 'class': 'ss-lines' }, svg);
  var gExtra = el('g', { 'class': 'ss-extra' }, svg);
  var gTiles = el('g', {}, svg);
  var gMarks = el('g', {}, svg);
  var gFlags = el('g', {}, svg);

  function drawBase() {
    tiles.forEach(function (t) {
      if (t.kind === 'section') {
        var h = T('home');
        el('path', { d: 'M' + (h.x + h.w / 2) + ',' + (h.y + h.h) + ' C' + (h.x + h.w / 2) + ',86 ' + (t.x + t.w / 2) + ',80 ' + (t.x + t.w / 2) + ',' + t.y }, gLines);
      }
      if (t.kind === 'page') {
        var p = T(t.parent);
        el('path', { d: 'M' + (p.x + 6) + ',' + (p.y + p.h) + ' V' + (t.y + t.h / 2) + ' H' + t.x }, gLines);
      }
    });
    tiles.forEach(function (t) {
      var g = el('g', { 'class': 'ss-tile ss-' + t.kind, 'data-id': t.id }, gTiles);
      el('rect', { x: t.x, y: t.y, width: t.w, height: t.h, rx: 7 }, g);
      el('rect', { 'class': 'ss-ln', x: t.x + 8, y: t.y + 9, width: t.w * 0.55, height: 5, rx: 2.5 }, g);
      el('rect', { 'class': 'ss-ln2', x: t.x + 8, y: t.y + 19, width: t.w * 0.38, height: 4, rx: 2 }, g);
      if (t.label) {
        var tx = el('text', { x: t.x + 8, y: t.y + t.h - 7, 'class': 'ss-lbl' }, g);
        tx.textContent = t.label;
      }
      t.g = g;
    });
  }
  drawBase();

  /* ---------- scenarios ---------- */
  var SCEN = [
    {
      prompt: 'Crawl example-store.com and fix weak titles and descriptions.',
      rows: [['Pages crawled', 128, '#1F7A3A'], ['Titles rewritten', 14, '#5C9E00'], ['Descriptions written', 22, '#2E8BC0'], ['Duplicate titles fixed', 9, '#8E6CC9']],
      marks: { '#5C9E00': ['home', 's0p0', 's0p2', 's1p1', 's2p0', 's2p3', 's3p1'], '#2E8BC0': ['s0p1', 's0p3', 's1p0', 's1p3', 's2p2', 's3p0', 's3p3'], '#8E6CC9': ['s0', 's1p2', 's3'] },
      issues: [['s0p0', 'Two product pages share the title "Shop"'], ['home', 'Home page title is 78 characters, too long']],
      fixLabel: 'Fixes'
    },
    {
      prompt: 'Find orphan pages and add internal links.',
      rows: [['Internal links mapped', 1940, '#1F7A3A'], ['Orphan pages found', 3, '#D9480F'], ['Links suggested', 24, '#5C9E00'], ['Links approved', 21, '#2E8BC0']],
      marks: { '#D9480F': ['s1p3', 's2p2', 's3p3'], '#5C9E00': ['s0p1', 's1p0', 's1p1', 's2p0', 's0p3'] },
      links: [['s1p0', 's1p3'], ['s0p1', 's2p2'], ['s2p0', 's3p3'], ['s1p1', 's2p2']],
      issues: [['s1p3', '/blog/trail-shoe-guide has no inbound links'], ['s3p3', '/help/size-guide has only 1 inbound link']],
      fixLabel: 'Links'
    },
    {
      prompt: 'Turn "trail running shoes for beginners" into a blog post.',
      rows: [['Questions people ask', 7, '#2E8BC0'], ['Words drafted', 1650, '#5C9E00'], ['Internal links added', 5, '#1F7A3A'], ['FAQ schema added', 1, '#8E6CC9']],
      marks: { '#5C9E00': ['s1p2'], '#1F7A3A': ['s0p0', 's0p2', 's2p1', 's2p3', 's1'], '#8E6CC9': ['s1p2'] },
      newTiles: ['s1p2'],
      issues: [['s1p1', 'Similar post exists: /blog/trail-shoe-guide'], ['s1p2', 'Draft waits for your review before publishing']],
      fixLabel: 'Post'
    },
    {
      prompt: 'Build landing pages for London, Dubai and Sydney.',
      rows: [['Pages drafted', 3, '#5C9E00'], ['Unique copy checks passed', 3, '#1F7A3A'], ['FAQs written', 15, '#2E8BC0'], ['Internal links added', 12, '#8E6CC9']],
      marks: { '#5C9E00': ['s2p1', 's2p2', 's2p3'], '#8E6CC9': ['s2', 's0', 'home'] },
      newTiles: ['s2p1', 's2p2', 's2p3'],
      issues: [['s2p2', 'Dubai page: add a local contact detail'], ['s2', 'Guides menu needs a link to the new pages']],
      fixLabel: 'Pages'
    }
  ];

  var timers = [], idx = 0, active = true, running = false;
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; }

  function fmt(n) { return n >= 1000 ? n.toLocaleString('en-GB') : String(n); }

  function selectTab(which) {
    var fix = which === 'fixes';
    tabFix.setAttribute('aria-selected', fix); tabIss.setAttribute('aria-selected', !fix);
    tabFix.tabIndex = fix ? 0 : -1; tabIss.tabIndex = fix ? -1 : 0;
    panelFix.hidden = !fix; panelIss.hidden = fix;
  }

  function reset() {
    gMarks.innerHTML = ''; gFlags.innerHTML = ''; gExtra.innerHTML = '';
    tiles.forEach(function (t) { t.g.classList.remove('seen', 'fresh'); });
    rowsEl.innerHTML = ''; issEl.innerHTML = '';
    rowsEl.hidden = true; issEl.hidden = true; emptyFix.hidden = false; emptyIss.hidden = false;
    cFix.hidden = true; cIss.hidden = true;
    tabFix.disabled = true; tabIss.disabled = true;
    selectTab('fixes');
    beam.hidden = true; beam.style.transition = 'none'; beam.style.top = '0%';
    goBtn.classList.remove('busy');
  }

  function typeText(s, done) {
    promptText.textContent = '';
    root.classList.add('typing');
    if (reduce) { promptText.textContent = s; root.classList.remove('typing'); done(); return; }
    var i = 0;
    (function tick() {
      i++; promptText.textContent = s.slice(0, i);
      if (i < s.length) later(tick, 28 + Math.random() * 30);
      else { root.classList.remove('typing'); later(done, 380); }
    })();
  }

  function markTile(id, color, delay) {
    var t = T(id); if (!t) return;
    later(function () {
      var n = gMarks.querySelectorAll('[data-for="' + id + '"]').length;
      var c = el('circle', { cx: t.x + t.w - 9 - n * 11, cy: t.y + 9, r: 4.6, fill: color, 'data-for': id, 'class': 'ss-dot' }, gMarks);
      return c;
    }, delay);
  }

  function run(sc) {
    running = true;
    reset();
    tabFix.querySelector('.ss-tab-name').textContent = sc.fixLabel;
    typeText(sc.prompt, function () {
      goBtn.classList.add('busy');
      status.textContent = 'Running: ' + sc.prompt;
      later(function () {
        // scan sweep
        var dur = reduce ? 0 : 1900;
        beam.hidden = reduce;
        beam.style.transition = 'none'; beam.style.top = '0%';
        void beam.offsetHeight;
        beam.style.transition = 'top ' + dur + 'ms linear';
        beam.style.top = '100%';
        // reveal tiles in order of y
        tiles.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (t) {
          later(function () { t.g.classList.add('seen'); }, dur * (t.y / H));
        });
        (sc.newTiles || []).forEach(function (id) { later(function () { T(id).g.classList.add('fresh'); }, dur * (T(id).y / H)); });
        // markers
        Object.keys(sc.marks).forEach(function (color) {
          sc.marks[color].forEach(function (id) { markTile(id, color, dur * (T(id).y / H) + 120); });
        });
        // extra link curves
        (sc.links || []).forEach(function (pair, k) {
          later(function () {
            var a = T(pair[0]), b = T(pair[1]);
            var x1 = a.x + a.w / 2, y1 = a.y + a.h, x2 = b.x + b.w / 2, y2 = b.y + b.h;
            var my = Math.max(y1, y2) + 26;
            el('path', { d: 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + my + ' ' + x2 + ',' + my + ' ' + x2 + ',' + y2, 'class': 'ss-link' }, gExtra);
          }, dur * 0.6 + k * 220);
        });
        // results rows counting up
        later(function () {
          emptyFix.hidden = true; rowsEl.hidden = false; tabFix.disabled = false;
          sc.rows.forEach(function (r, k) {
            later(function () {
              var row = document.createElement('div'); row.className = 'ss-row';
              row.innerHTML = '<span class="ss-sw" style="background:' + r[2] + '"></span><span class="ss-name"></span><span class="ss-num">0</span>';
              row.querySelector('.ss-name').textContent = r[0];
              rowsEl.appendChild(row);
              countUp(row.querySelector('.ss-num'), r[1], reduce ? 0 : 900);
            }, k * 260);
          });
          cFix.textContent = sc.rows.length; cFix.hidden = false;
        }, dur * 0.35);
        // issues
        later(function () {
          goBtn.classList.remove('busy'); beam.hidden = true;
          emptyIss.hidden = true; issEl.hidden = false; tabIss.disabled = false;
          sc.issues.forEach(function (it, k) {
            var t = T(it[0]);
            var fx = t.x + t.w - 6, fy = t.y - 6;
            var g = el('g', { 'class': 'ss-flag' }, gFlags);
            el('path', { d: 'M' + fx + ',' + (fy - 13) + ' L' + (fx + 12) + ',' + (fy + 8) + ' L' + (fx - 12) + ',' + (fy + 8) + ' Z' }, g);
            var tx = el('text', { x: fx, y: fy + 5, 'text-anchor': 'middle' }, g); tx.textContent = k + 1;
            var li = document.createElement('li');
            li.innerHTML = '<b>' + (k + 1) + '</b><span></span>';
            li.querySelector('span').textContent = it[1];
            issEl.appendChild(li);
          });
          cIss.textContent = sc.issues.length; cIss.hidden = false;
          status.textContent = sc.rows.length + ' results and ' + sc.issues.length + ' issues found (sample).';
          running = false;
          if (!reduce) {
            later(function () { if (!userTouched) selectTab('issues'); }, 2600);
            later(next, 6200);
          }
        }, dur + 900);
      }, reduce ? 0 : 650);
    });
  }

  function countUp(node, target, ms) {
    if (!ms) { node.textContent = fmt(target); return; }
    var start = performance.now();
    (function step(now) {
      var p = Math.min(1, (now - start) / ms);
      node.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1 && active) requestAnimationFrame(step); else node.textContent = fmt(target);
    })(start);
  }

  var userTouched = false;
  function next() { if (!active) return; userTouched = false; idx = (idx + 1) % SCEN.length; run(SCEN[idx]); }

  [tabFix, tabIss].forEach(function (b) {
    b.addEventListener('click', function () { userTouched = true; selectTab(b.getAttribute('data-tab')); });
    b.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var o = b === tabFix ? tabIss : tabFix; if (!o.disabled) { o.focus(); o.click(); } }
    });
  });

  // pause when off screen or tab hidden
  function pause() { active = false; clearAll(); }
  function resume() { if (active) return; active = true; run(SCEN[idx]); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { e.isIntersecting ? resume() : pause(); }); }, { threshold: 0.15 }).observe(root);
  }
  document.addEventListener('visibilitychange', function () { document.hidden ? pause() : resume(); });

  run(SCEN[0]);
})();
