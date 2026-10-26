/* DoVoWorld Automation Studio: interactive demo on sample data. No network calls. */
(function () {
  var root = document.getElementById('studio');
  if (!root) return;

  var TEMPLATES = {
    leads: {
      label: 'Lead capture',
      goal: 'Every enquiry lands in one place and the right person hears about it straight away.',
      steps: [
        { kind: 'trigger', title: 'Form submitted', tool: 'Website form or chat', log: 'New enquiry received from the website form (sample: "Priya S., needs SEO help").' },
        { kind: 'action', title: 'Validate and de-duplicate', tool: 'Checks email, drops repeats', log: 'Email format is valid. No earlier enquiry from this address.' },
        { kind: 'action', title: 'Save to CRM or sheet', tool: 'Google Sheets or your CRM', log: 'Row added to the Leads sheet with source and timestamp.' },
        { kind: 'action', title: 'Alert the owner', tool: 'WhatsApp and email', log: 'Alert sent to the owner by WhatsApp and email.' },
        { kind: 'action', title: 'Send auto-reply', tool: 'Email to the lead', log: 'Friendly confirmation email sent to the lead.' }
      ]
    },
    audit: {
      label: 'SEO audit report',
      goal: 'Enter a site address and receive a prioritised list of fixes by email.',
      steps: [
        { kind: 'trigger', title: 'Site URL entered', tool: 'Form or sheet', log: 'Audit requested for a sample site (example.com).' },
        { kind: 'action', title: 'Crawl the site', tool: 'Crawler', log: 'Crawled 120 sample pages. Found broken links, duplicate titles, slow pages.' },
        { kind: 'ai', title: 'Group issues by impact', tool: 'Claude', log: 'Issues grouped into high, medium and low impact with a plain-language reason for each.' },
        { kind: 'action', title: 'Build the report', tool: 'Document template', log: 'Report drafted with top 10 fixes first.' },
        { kind: 'action', title: 'Email the report', tool: 'Email', log: 'Report emailed to the requester for review.' }
      ]
    },
    brief: {
      label: 'Content brief',
      goal: 'Turn a keyword into a writer-ready brief and save it where the team works.',
      steps: [
        { kind: 'trigger', title: 'Keyword added', tool: 'Google Sheets row', log: 'New keyword added to the content sheet (sample: "ecommerce seo checklist").' },
        { kind: 'action', title: 'Fetch search results', tool: 'Search data', log: 'Top results and related questions collected for the keyword.' },
        { kind: 'ai', title: 'Draft the brief', tool: 'Claude', log: 'Brief drafted: search intent, headings, questions to answer, internal link ideas.' },
        { kind: 'action', title: 'Save to Drive', tool: 'Google Drive', log: 'Brief saved to the shared content folder.' },
        { kind: 'action', title: 'Notify the writer', tool: 'Email or chat', log: 'Writer notified with a link to the brief.' }
      ]
    },
    ads: {
      label: 'Ad alerts',
      goal: 'Catch campaigns that drift while there is still time to act.',
      steps: [
        { kind: 'trigger', title: 'Every morning, 8:00', tool: 'Schedule', log: 'Daily check started.' },
        { kind: 'action', title: 'Read ad spend', tool: 'Google and Meta ads', log: 'Spend and cost per result read for 6 sample campaigns.' },
        { kind: 'action', title: 'Compare to thresholds', tool: 'Rules you agree with us', log: 'One sample campaign is above its agreed cost per result.' },
        { kind: 'ai', title: 'Explain the drift', tool: 'Claude', log: 'Short note written: what changed, likely cause, suggested next step.' },
        { kind: 'action', title: 'Send the alert', tool: 'Email or chat', log: 'Alert sent to the media owner with the note attached.' }
      ]
    },
    report: {
      label: 'Weekly report',
      goal: 'Stop spending Monday morning copying numbers between dashboards.',
      steps: [
        { kind: 'trigger', title: 'Every Monday, 8:00', tool: 'Schedule', log: 'Weekly report run started.' },
        { kind: 'action', title: 'Pull the numbers', tool: 'Analytics, ads, CRM', log: 'Last 7 days collected from analytics, ads and CRM (sample data).' },
        { kind: 'ai', title: 'Write the summary', tool: 'Claude', log: 'Plain-language summary written: what changed and what to do next.' },
        { kind: 'action', title: 'Build the document', tool: 'Doc template', log: 'Report document created with charts and the summary.' },
        { kind: 'action', title: 'Email the client', tool: 'Email', log: 'Report emailed to the client contact.' }
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

  var current = 'leads';
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

  load('leads');
})();
