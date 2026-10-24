// ===== Mobile menu =====
const burger = document.querySelector('.burger');
const mobilePanel = document.querySelector('.mobile-panel');
if(burger){
  burger.addEventListener('click', () => {
    mobilePanel.classList.toggle('open');
  });
}

// ===== Desktop mega menu (click to open, click outside to close) =====
document.querySelectorAll('.nav > li.has-mega > .nav-top-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const li = btn.closest('li');
    const wasOpen = li.classList.contains('open');
    document.querySelectorAll('.nav > li.open').forEach(el => el.classList.remove('open'));
    if(!wasOpen) li.classList.add('open');
  });
});
document.addEventListener('click', (e) => {
  if(!e.target.closest('.nav > li.has-mega')){
    document.querySelectorAll('.nav > li.open').forEach(el => el.classList.remove('open'));
  }
});

// ===== Blog filter (blog.html only) =====
document.querySelectorAll('.blog-filter button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.blog-filter button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.cat;
    document.querySelectorAll('.blog-card').forEach(card => {
      card.style.display = (cat === 'all' || card.dataset.cat === cat) ? '' : 'none';
    });
  });
});

// ===== Contact form (posts to /api/contact, emailed to the team) =====
const contactForm = document.getElementById('contact-form');
if(contactForm){
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'SENDING...';
    const val = (id) => (document.getElementById(id) || {}).value || '';
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          name: val('name'), email: val('email'), company: val('company'),
          topic: val('topic'), message: val('message'), website: val('website')
        })
      });
      const out = await res.json().catch(() => ({}));
      if(!res.ok || !out.ok) throw new Error(out.error || 'failed');
      btn.textContent = 'SENT. WE\'LL REPLY WITHIN 24H';
      if(typeof gtag === 'function'){ gtag('event', 'generate_lead', {form: 'contact', topic: val('topic')}); }
    } catch(err){
      btn.disabled = false;
      btn.textContent = original;
      alert('Sorry, that did not send. Please email hello@dovoworld.com or message us on WhatsApp.');
    }
  });
}

// ===== AI Assistant widget ("Ask Falcon") =====
const aiFab = document.getElementById('ai-fab');
const chatPanel = document.getElementById('chat-panel');
const chatBody = document.getElementById('chat-body');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

if(aiFab){
  aiFab.addEventListener('click', () => chatPanel.classList.toggle('open'));
}

const cannedAnswers = {
  "services": "We run SEO, performance media (Google/Meta), content and creative, and marketing automation, all coordinated by our AI systems layer so nothing works in a silo.",
  "pricing": "Pricing is scoped to the channels and markets you need. Share your goals on the Contact page and we'll come back with a straight, no-guesswork proposal.",
  "seo tools": "Our SEO Tools suite covers site audits, rank tracking, keyword opportunity mapping and content gap analysis. Head to the SEO Tools page in the menu to see the full stack.",
  "contact": "You can reach the team directly on WhatsApp (button below) or through the Contact Us page, we typically reply within a business day."
};

function botReply(text){
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.textContent = text;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}
function userMsg(text){
  const div = document.createElement('div');
  div.className = 'msg user';
  div.textContent = text;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}
function respondTo(query){
  const q = query.toLowerCase();
  const key = Object.keys(cannedAnswers).find(k => q.includes(k));
  setTimeout(() => {
    botReply(key ? cannedAnswers[key] : "Good question. A strategist can give you a sharper answer than I can. Want me to route this to the team on WhatsApp or the Contact page?");
  }, 450);
}

document.querySelectorAll('.chat-quick button').forEach(btn => {
  btn.addEventListener('click', () => {
    userMsg(btn.textContent);
    respondTo(btn.dataset.q || btn.textContent);
  });
});

if(chatSend){
  chatSend.addEventListener('click', sendChat);
  chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') sendChat(); });
}
function sendChat(){
  const val = chatInput.value.trim();
  if(!val) return;
  userMsg(val);
  respondTo(val);
  chatInput.value = '';
}


// ===== GA4 events (only fire if the Google tag is present) =====
function track(name, params){
  if(typeof gtag === 'function'){ gtag('event', name, params || {}); }
}
document.addEventListener('click', (e) => {
  const a = e.target.closest ? e.target.closest('a') : null;
  if(!a) return;
  const h = a.getAttribute('href') || '';
  if(h.indexOf('wa.me') > -1){ track('whatsapp_click', {link_url: h}); }
  else if(h.indexOf('mailto:') === 0){ track('email_click'); }
  else if(h.indexOf('tel:') === 0){ track('phone_click'); }
  else if(h === '/contact' && /audit/i.test(a.textContent)){ track('audit_cta_click', {page_path: location.pathname}); }
});
if(aiFab){ aiFab.addEventListener('click', () => track('chat_open')); }

// ===== Cookie consent (shown to visitors in European time zones: UK, EU, CH) =====
(function(){
  var KEY = 'dvw_consent';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch(e){}
  function apply(v){
    if(typeof gtag === 'function'){ gtag('consent', 'update', {analytics_storage: v}); }
  }
  if(stored === 'granted' || stored === 'denied'){ apply(stored); return; }
  var tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch(e){}
  if(!/^(Europe|Atlantic\/(Reykjavik|Faroe|Madeira|Canary))/.test(tz)) return;
  var bar = document.createElement('div');
  bar.className = 'consent-bar';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Cookie consent');
  bar.innerHTML = '<p>We use analytics cookies to understand how the site is used and improve it. Nothing is tracked unless you accept. <a href="/privacy" style="color:#B6FF3C">Privacy policy</a></p>' +
    '<div><button type="button" class="consent-no">Decline</button><button type="button" class="consent-yes">Accept</button></div>';
  document.body.appendChild(bar);
  function choose(v){
    try { localStorage.setItem(KEY, v); } catch(e){}
    apply(v);
    bar.remove();
  }
  bar.querySelector('.consent-yes').addEventListener('click', function(){ choose('granted'); });
  bar.querySelector('.consent-no').addEventListener('click', function(){ choose('denied'); });
})();
