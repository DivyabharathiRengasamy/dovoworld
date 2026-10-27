(function () {
  "use strict";
  var form = document.getElementById("bd-form");
  if (!form) return;

  var topicEl = document.getElementById("bd-topic");
  var angleEl = document.getElementById("bd-angle");
  var hpEl = document.getElementById("bd-website");
  var submitEl = document.getElementById("bd-submit");
  var errEl = document.getElementById("bd-err");
  var outEl = document.getElementById("bd-out");
  var statusEl = document.getElementById("bd-status");
  var bodyEl = document.getElementById("bd-body");

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Minimal, safe markdown -> HTML: headings, bullet lists, bold, paragraphs.
  function renderMarkdown(raw) {
    var lines = escapeHtml(raw).replace(/\r\n/g, "\n").split("\n");
    var html = "";
    var inList = false;
    function closeList() { if (inList) { html += "</ul>"; inList = false; } }
    function inline(t) {
      return t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var m;
      if ((m = line.match(/^###\s+(.*)/))) { closeList(); html += "<h3>" + inline(m[1]) + "</h3>"; }
      else if ((m = line.match(/^##\s+(.*)/))) { closeList(); html += "<h2>" + inline(m[1]) + "</h2>"; }
      else if ((m = line.match(/^#\s+(.*)/))) { closeList(); html += "<h1>" + inline(m[1]) + "</h1>"; }
      else if ((m = line.match(/^[-*]\s+(.*)/))) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += "<li>" + inline(m[1]) + "</li>";
      } else if (line.trim() === "") { closeList(); }
      else { closeList(); html += "<p>" + inline(line) + "</p>"; }
    }
    closeList();
    return html;
  }

  var busy = false;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (busy) return;

    errEl.hidden = true;
    var topic = topicEl.value.trim();
    if (topic.length < 3) {
      errEl.textContent = "Tell us a topic or keyword to write about.";
      errEl.hidden = false;
      return;
    }

    busy = true;
    submitEl.disabled = true;
    submitEl.textContent = "Writing…";
    outEl.hidden = false;
    statusEl.textContent = "Writing…";
    bodyEl.innerHTML = '<span class="cursor"></span>';
    bodyEl.scrollIntoView({ behavior: "smooth", block: "nearest" });

    var acc = "";

    fetch("/api/blog-demo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic: topic, angle: angleEl.value.trim(), website: hpEl.value }),
    })
      .then(function (res) {
        if (!res.ok || !res.body) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            throw new Error(data.error || "Could not generate a draft right now.");
          });
        }
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buf = "";

        function pump() {
          return reader.read().then(function (r) {
            if (r.done) {
              statusEl.textContent = "Done";
              submitEl.disabled = false;
              submitEl.textContent = "Generate the post";
              busy = false;
              bodyEl.innerHTML = renderMarkdown(acc);
              return;
            }
            buf += decoder.decode(r.value, { stream: true });
            var events = buf.split("\n\n");
            buf = events.pop();
            events.forEach(function (evt) {
              var line = evt.replace(/^data:\s*/, "").trim();
              if (!line || line === "[DONE]") return;
              try {
                var parsed = JSON.parse(line);
                if (typeof parsed.response === "string") {
                  acc += parsed.response;
                  bodyEl.innerHTML = renderMarkdown(acc) + '<span class="cursor"></span>';
                }
              } catch (err) { /* ignore partial/non-JSON chunks */ }
            });
            return pump();
          });
        }
        return pump();
      })
      .catch(function (err) {
        statusEl.textContent = "Could not finish";
        submitEl.disabled = false;
        submitEl.textContent = "Generate the post";
        busy = false;
        errEl.textContent = err && err.message ? err.message : "Could not generate a draft right now.";
        errEl.hidden = false;
      });
  });
})();
