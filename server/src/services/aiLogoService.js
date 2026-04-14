const { createHttpError } = require("../utils/createHttpError");
const { getEnv } = require("../config/env");

function extractSvg(text) {
  const s = String(text || "");
  const start = s.indexOf("<svg");
  const end = s.indexOf("</svg>");
  if (start === -1 || end === -1) return null;
  return s.slice(start, end + "</svg>".length);
}

function sanitizeSvg(svg) {
  let out = String(svg || "");
  out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/\son\w+="[^"]*"/gi, "");
  out = out.replace(/\son\w+='[^']*'/gi, "");
  out = out.replace(/xlink:href="javascript:[^"]*"/gi, "");
  out = out.replace(/href="javascript:[^"]*"/gi, "");
  return out.trim();
}

function svgToDataUrl(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildPrompt({ clubName, primary, secondary, theme, style, monogram }) {
  const styleLine =
    style === "aggressive"
      ? "Style: aggressive, sharp geometry, high contrast, angular shield, tactical HUD details."
      : style === "classic"
        ? "Style: classic heritage crest, balanced symmetry, bold simple forms."
        : "Style: minimal modern crest, simple shapes, clean negative space.";

  const monogramLine = monogram
    ? `Monogram constraint: incorporate the monogram "${monogram}" as a shape-based emblem (no text rendering).`
    : "Monogram constraint: derive a simple 1–2 letter monogram from the club name as a shape-based emblem (no text rendering).";

  return `
Design a premium football club crest logo as a single standalone SVG.

Constraints:
- Output ONLY the raw <svg>...</svg> (no markdown, no explanations).
- Square format: viewBox="0 0 512 512".
- No external images, no external fonts, no <style>, no <script>.
- Use only: <path>, <circle>, <rect>, <g>, <linearGradient>, <radialGradient>, <defs>.
- Maximum 12 shapes total.
- Clean, bold, high-contrast icon; readable at 64px.
- Primary color: ${primary}
- Secondary color: ${secondary}

Club name: "${clubName}"
Theme: "${theme}"
${styleLine}
${monogramLine}

Design direction:
- Futuristic tactical HUD vibe for neon/night; classic badge for classic.
- Avoid any <text> nodes entirely.
- Add subtle gradient only if it enhances depth.
`.trim();
}

async function generateLogoSvg({ clubName, primary, secondary, theme, style, monogram }) {
  const env = getEnv();
  if (!env.googleAiStudioApiKey) throw createHttpError(400, "AI logo generation is not configured on server");
  if (typeof fetch !== "function") throw createHttpError(500, "Server fetch is not available");

  const prompt = buildPrompt({ clubName, primary, secondary, theme, style, monogram });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(
    env.googleAiStudioApiKey
  )}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || "AI request failed";
    throw createHttpError(502, msg);
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n") || "";
  const extracted = extractSvg(text);
  if (!extracted) throw createHttpError(502, "AI did not return valid SVG");

  const svg = sanitizeSvg(extracted);
  if (!svg.startsWith("<svg")) throw createHttpError(502, "Invalid SVG output");

  return { svg, url: svgToDataUrl(svg) };
}

module.exports = { generateLogoSvg };
