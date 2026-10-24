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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") return handleContact(request, env);
    return env.ASSETS.fetch(request);
  },
};
