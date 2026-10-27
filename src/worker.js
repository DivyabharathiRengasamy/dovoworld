import { EmailMessage } from "cloudflare:email";

const TO = "divyabharathi.renga@gmail.com";
const FROM = "hello@dovoworld.com";

const clean = (v, max) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

async function handleContact(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  let data;
  try { data = await request.json(); } catch { return json({ ok: false, error: "Invalid request" }, 400); }

  if (data.website) return json({ ok: true }); // honeypot: bots fill this, humans don't

  const name = clean(data.name, 100);
  const email = clean(data.email, 150);
  const company = clean(data.company, 150);
  const topic = clean(data.topic, 100);
  const message = String(data.message ?? "").trim().slice(0, 4000);
  if (!name || !topic || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: "Please fill in all required fields." }, 400);
  }

  const subject = `New lead: ${topic} - ${name}`;
  const body = [
    `Name: ${name}`, `Email: ${email}`, `Company: ${company || "-"}`, `Topic: ${topic}`, "",
    message, "", `Sent from dovoworld.com contact form`,
  ].join("\r\n");

  const raw = [
    `From: DoVoWorld Website <${FROM}>`,
    `To: ${TO}`,
    `Reply-To: ${email}`,
    `Subject: ${subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@dovoworld.com>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");

  try {
    await env.EMAIL.send(new EmailMessage(FROM, TO, raw));
  } catch (e) {
    return json({ ok: false, error: "Could not send right now. Please email hello@dovoworld.com." }, 502);
  }
  return json({ ok: true });
}

const BLOG_SYSTEM_PROMPT = `You are the writer behind DoVoWorld's SEO blog automation. A visitor is trying a live demo of the tool, so write a real, publishable-quality blog post about the topic they give you, around 1500 words, so they can judge the tool's quality for themselves.

Structure:
- Start with a single H1 title (# ) built around the topic/keyword.
- A short, direct introduction (2-3 sentences) that states what the reader will get from the post.
- 4-6 H2 sections (## ) that thoroughly cover the topic and the likely search intent behind it, each with 2-4 short paragraphs or a bullet list where that helps.
- A short FAQ section with an H2 heading "Frequently asked questions", containing 3 real questions a reader would search, each as an H3 (### ) with a 1-3 sentence answer.
- A brief conclusion with a natural, non-pushy call to action.

Rules: Plain, clear English. No filler sentences, no generic throat-clearing. Never invent statistics, named studies, surveys or quotes and never attribute quotes to real people. Do not mention that you are an AI or that this is a demo. Output only the markdown for the post, nothing else.`;

async function handleBlogDemo(request, env) {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);
  let data;
  try { data = await request.json(); } catch { return json({ ok: false, error: "Invalid request" }, 400); }

  if (data.website) return json({ ok: false, error: "Could not generate a draft right now." }, 400); // honeypot

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (env.BLOG_DEMO_LIMITER) {
    const { success } = await env.BLOG_DEMO_LIMITER.limit({ key: ip });
    if (!success) {
      return json({ ok: false, error: "This demo is getting a lot of use right now. Please try again in a minute." }, 429);
    }
  }

  const topic = clean(data.topic, 160);
  const angle = clean(data.angle, 220);
  if (topic.length < 3) {
    return json({ ok: false, error: "Tell us a topic or keyword to write about (at least a few characters)." }, 400);
  }

  const userPrompt = angle
    ? `Topic or keyword: ${topic}\nSpecific angle or audience to focus on: ${angle}`
    : `Topic or keyword: ${topic}`;

  if (!env.AI) {
    return json({ ok: false, error: "The live demo is temporarily unavailable. Please try again shortly." }, 503);
  }

  let stream;
  try {
    stream = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: BLOG_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2300,
      stream: true,
    });
  } catch (e) {
    return json({ ok: false, error: "Could not generate a draft right now. Please try again." }, 502);
  }

  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") return handleContact(request, env);
    if (url.pathname === "/api/blog-demo") return handleBlogDemo(request, env);
    return env.ASSETS.fetch(request);
  },
};
