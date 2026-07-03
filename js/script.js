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

// ===== Contact form (static demo — wire to your backend / email service) =====
const contactForm = document.getElementById('contact-form');
if(contactForm){
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    btn.textContent = 'SENT — WE\'LL REPLY WITHIN 24H';
    btn.disabled = true;
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
  "services": "We run SEO, performance media (Google/Meta), content and creative, and marketing automation — all coordinated by our AI systems layer so nothing works in a silo.",
  "pricing": "Pricing is scoped to the channels and markets you need. Share your goals on the Contact page and we'll come back with a straight, no-guesswork proposal.",
  "seo tools": "Our SEO Tools suite covers site audits, rank tracking, keyword opportunity mapping and content gap analysis. Head to the SEO Tools page in the menu to see the full stack.",
  "contact": "You can reach the team directly on WhatsApp (button below) or through the Contact Us page — we typically reply within a business day."
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
    botReply(key ? cannedAnswers[key] : "Good question — a strategist can give you a sharper answer than I can. Want me to route this to the team on WhatsApp or the Contact page?");
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
