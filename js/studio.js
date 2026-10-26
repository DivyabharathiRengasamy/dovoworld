/* DoVoWorld Automation Studio: interactive demo on sample data. No network calls. */
(function () {
  var root = document.getElementById('studio');
  if (!root) return;

  var TEMPLATES = {
    crawler: {
      label: 'Title and description fixer',
      goal: 'Crawl the site, find weak titles and descriptions, rewrite them and publish the approved ones.',
      steps: [
        { kind: 'trigger', title: 'Site connected', tool: 'Your site URL', log: 'Crawl started for a sample site (example-store.com).' },
        { kind: 'action', title: 'Crawl every page', tool: 'Crawler', log: '128 pages crawled. Title, meta description and H1 extracted for each.' },
        { kind: 'action', title: 'Flag problems', tool: 'Length, duplicates, missing', log: '14 titles too long, 9 duplicates, 22 descriptions missing.' },
        { kind: 'ai', title: 'Write new versions', tool: 'Claude, your brand voice', log: 'New titles and descriptions written around each page\'s keyword.' },
        { kind: 'action', title: 'Your approval', tool: 'Approve, edit or reject', log: '36 changes approved, 2 edited, 1 rejected (sample).' },
        { kind: 'action', title: 'Publish live', tool: 'Your CMS or repository', log: 'Approved changes published to the live site and logged.' }
      ]
    },
    blog: {
      label: 'Keyword to blog post',
      goal: 'Turn a keyword into a researched, linked and reviewed blog post on your site.',
      steps: [
        { kind: 'trigger', title: 'Keyword added', tool: 'Keyword list or sheet', log: 'New keyword: "trail running shoes for beginners".' },
        { kind: 'action', title: 'Research the search', tool: 'Search results, questions', log: 'Search intent and 7 common questions collected.' },
        { kind: 'ai', title: 'Brief and draft', tool: 'Claude, your tone', log: 'Outline approved, full draft written in your brand voice.' },
        { kind: 'action', title: 'Links, meta, schema', tool: 'Internal links, FAQ schema', log: '5 internal links, title, description and FAQ schema added.' },
        { kind: 'action', title: 'Your review', tool: 'Edit inline or approve', log: 'Post reviewed and approved (sample).' },
        { kind: 'action', title: 'Publish', tool: 'Scheduled', log: 'Post scheduled for Tuesday at 9:00.' }
      ]
    },
    landing: {
      label: 'Landing pages',
      goal: 'Build a unique landing page for each service, product or location you want to rank for.',
      steps: [
        { kind: 'trigger', title: 'List of pages', tool: 'Services, products or cities', log: '6 pages requested: ecommerce SEO in London, Dubai, Sydney and 3 platform pages.' },
        { kind: 'action', title: 'Research each search', tool: 'Local and topic intent', log: 'What people search for in each market collected.' },
        { kind: 'ai', title: 'Write unique copy', tool: 'Claude', log: '6 drafts written. Unique-copy check passed on all of them.' },
        { kind: 'action', title: 'Add FAQs and schema', tool: 'FAQ, breadcrumb, service', log: 'FAQs, schema and internal links added to each page.' },
        { kind: 'action', title: 'Build in your design', tool: 'Your site template', log: 'Pages built with your site header, footer and styles.' },
        { kind: 'action', title: 'Publish', tool: 'After your approval', log: 'Approved pages published and added to the sitemap.' }
      ]
    },
    linking: {
      label: 'Internal linking',
      goal: 'Map every inbound and outbound internal link, find orphan pages and add the missing links.',
      steps: [
        { kind: 'trigger', title: 'Weekly check', tool: 'Schedule', log: 'Internal link check started.' },
        { kind: 'action', title: 'Map all links', tool: 'Inbound and outbound', log: '128 pages mapped: 1,940 internal links found.' },
        { kind: 'action', title: 'Find gaps', tool: 'Orphans, weak pages', log: '3 orphan pages and 11 pages with fewer than 3 inbound links.' },
        { kind: 'ai', title: 'Suggest links', tool: 'Claude, natural anchors', log: '24 link suggestions with anchor text from related pages.' },
        { kind: 'action', title: 'Your approval', tool: 'Approve or skip', log: '21 links approved (sample).' },
        { kind: 'action', title: 'Add links live', tool: 'Your CMS or repository', log: 'Approved links added to the live pages and logged.' }
      ]
    }
  };

  var EXTRAS = {
    filter: { kind: 'action', title: 'Filter', tool: 'Only continue if a rule matches', log: 'Rule checked. This item matches, so the flow continues.' },
    wait: { kind: 'action', title: 'Wait', tool: 'Pause for a set time', log: 'Waited 10 minutes (shortened for the demo).' },
    ai: { kind: 'ai', title: 'AI summarise', tool: 'Claude', log: 'Summary written in two short sentences.' },
    sheet: { kind: 'action', title: 'Update sheet', tool: 'Google Sheets', log: 'Row updated in the tracking sheet.' },
    chat: { kind: 'action', title: 'Send chat alert', tool: 'Slack or Teams', log: 'Message posted to the team channel.' },
    task: { kind: 'action', title: 'Create task', tool: 'Project tool', log: 'Task created and assigned to the owner.' }
  };

  var tabsEl = root.querySelector('.studio-tabs');
  var goalEl = root.querySelector('.studio-goal');
  var wrap = root.querySelector('.canvas-wrap');
  var canvas = root.querySelector('.canvas');
  var svg = root.querySelector('svg.wires');
  var logEl = root.querySelector('.log ol');
  var runBtn = root.querySelector('[data-act="run"]');
  var resetBtn = root.querySelector('[data-act="reset"]');
  var addBtns = root.querySelectorAll('.chips button');
  var ctaLink = root.querySelector('[data-cta]');

  var current = 'crawler';
  var steps = [];
  var running = false;
  var timers = [];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function load(key) {
    stopRun();
    current = key;
    steps = clone(TEMPLATES[key].steps);
    goalEl.textContent = TEMPLATES[key].goal;
    Array.prototype.forEach.call(tabsEl.querySelectorAll('button'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-key') === key ? 'true' : 'false');
    });
    logEl.innerHTML = '';
    addLog('Pick <b>Run demo</b> to watch this flow work on sample data.');
    render();
  }

  function render(popIndex) {
    canvas.querySelectorAll('.snode').forEach(function (n) { n.remove(); });
    steps.forEach(function (s, i) {
      var d = document.createElement('div');
      d.className = 'snode' + (i === popIndex ? ' pop' : '');
      d.setAttribute('data-kind', s.kind);
      d.setAttribute('data-i', i);
      var kindLabel = s.kind === 'trigger' ? 'Trigger' : (s.kind === 'ai' ? 'AI step' : 'Step ' + i);
      d.innerHTML = '<div class="kind"></div><h4></h4><p></p><span class="state"></span>';
      d.querySelector('.kind').textContent = kindLabel;
      d.querySelector('h4').textContent = s.title;
      d.querySelector('p').textContent = s.tool;
      d.querySelector('.state').textContent = 'Running';
      if (i > 0) {
        var rm = document.createElement('button');
        rm.className = 'rm'; rm.type = 'button';
        rm.setAttribute('aria-label', 'Remove step ' + s.title);
        rm.textContent = '×';
        rm.addEventListener('click', function () {
          if (running) return;
          steps.splice(i, 1); render(); resetLog();
        });
        d.appendChild(rm);
      }
      canvas.appendChild(d);
    });
    canvas.style.minWidth = (steps.length * 128 + (steps.length - 1) * 30) + 'px';
    requestAnimationFrame(drawWires);
    if (ctaLink) ctaLink.textContent = 'Get "' + TEMPLATES[current].label + '" built for you';
  }

  function resetLog() {
    logEl.innerHTML = '';
    addLog('Flow changed. Pick <b>Run demo</b> to run it again.');
  }

  function drawWires() {
    var nodes = canvas.querySelectorAll('.snode');
    var cb = canvas.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + canvas.offsetWidth + ' ' + canvas.offsetHeight);
    svg.innerHTML = '';
    for (var i = 0; i < nodes.length - 1; i++) {
      var a = nodes[i].getBoundingClientRect(), b = nodes[i + 1].getBoundingClientRect();
      var d;
      var vertical = b.top > a.bottom - 10;
      if (vertical) {
        var x1 = a.left - cb.left + a.width / 2, y1 = a.bottom - cb.top;
        var x2 = b.left - cb.left + b.width / 2, y2 = b.top - cb.top;
        var my = (y1 + y2) / 2;
        d = 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + my + ' ' + x2 + ',' + my + ' ' + x2 + ',' + y2;
      } else {
        var sx = a.right - cb.left, sy = a.top - cb.top + a.height / 2;
        var ex = b.left - cb.left, ey = b.top - cb.top + b.height / 2;
        var mx = (sx + ex) / 2;
        d = 'M' + sx + ',' + sy + ' C' + mx + ',' + sy + ' ' + mx + ',' + ey + ' ' + ex + ',' + ey;
      }
      var base = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      base.setAttribute('d', d); base.setAttribute('class', 'wire-base');
      var run = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      run.setAttribute('d', d); run.setAttribute('class', 'wire-run'); run.setAttribute('data-w', i);
      svg.appendChild(base); svg.appendChild(run);
      var len = run.getTotalLength();
      run.style.strokeDasharray = len; run.style.strokeDashoffset = len;
    }
  }

  function addLog(html, cls) {
    var li = document.createElement('li');
    if (cls) li.className = cls;
    li.innerHTML = html;
    logEl.appendChild(li);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  function setButtons() {
    runBtn.disabled = running;
    resetBtn.disabled = running;
    addBtns.forEach(function (b) { b.disabled = running; });
  }

  function stopRun() {
    timers.forEach(clearTimeout); timers = [];
    running = false;
    if (runBtn) setButtons();
  }

  function run() {
    if (running) return;
    running = true; setButtons();
    drawWires();
    canvas.querySelectorAll('.snode').forEach(function (n) { n.classList.remove('active', 'done'); n.querySelector('.state').textContent = 'Running'; });
    svg.querySelectorAll('.wire-run').forEach(function (w) {
      w.style.transition = 'none'; w.style.strokeDashoffset = w.getTotalLength();
    });
    logEl.innerHTML = '';
    var step = reduce ? 250 : 1100;
    var nodes = canvas.querySelectorAll('.snode');
    steps.forEach(function (s, i) {
      timers.push(setTimeout(function () {
        if (i > 0) {
          nodes[i - 1].classList.remove('active'); nodes[i - 1].classList.add('done');
          nodes[i - 1].querySelector('.state').textContent = 'Done';
          var w = svg.querySelector('[data-w="' + (i - 1) + '"]');
          if (w) { w.style.transition = reduce ? 'none' : 'stroke-dashoffset .6s ease'; w.style.strokeDashoffset = 0; }
        }
        nodes[i].classList.add('active');
        addLog('<b>' + (i + 1) + '. ' + esc(s.title) + '</b><br>' + esc(s.log));
      }, i * step));
    });
    timers.push(setTimeout(function () {
      var last = nodes[nodes.length - 1];
      last.classList.remove('active'); last.classList.add('done'); last.querySelector('.state').textContent = 'Done';
      addLog('Flow finished with 0 errors (sample run).', 'end');
      running = false; setButtons();
    }, steps.length * step));
  }

  tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-key]');
    if (b) load(b.getAttribute('data-key'));
  });
  runBtn.addEventListener('click', run);
  resetBtn.addEventListener('click', function () { if (!running) load(current); });
  addBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      if (running) return;
      if (steps.length >= 8) { addLog('Eight steps is the limit in this demo.'); return; }
      steps.push(clone(EXTRAS[b.getAttribute('data-add')]));
      render(steps.length - 1);
      resetLog();
      wrap.scrollLeft = wrap.scrollWidth;
    });
  });

  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(drawWires, 120); });
  wrap.addEventListener('scroll', function () { /* wires are inside the scrolling content, no redraw needed */ });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawWires);

  load('crawler');
})();
