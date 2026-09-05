import { MENU_TEXT } from "./menu";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export type VoiceTurn = { role: "user" | "assistant"; content: string };

function key() {
  const k = process.env["LOVABLE_API_KEY"];
  if (!k) throw new Error("Missing LOVABLE_API_KEY");
  return k;
}

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export async function transcribe(audioBase64: string, mime: string) {
  const ext = mime.includes("mp4") || mime.includes("m4a") ? "m4a" : "webm";
  const form = new FormData();
  form.append("file", new Blob([base64ToBytes(audioBase64)], { type: mime }), `clip.${ext}`);
  form.append("model", "openai/gpt-4o-mini-transcribe");

  const res = await fetch(`${GATEWAY}/audio/transcriptions`, {
    method: "POST",
    headers: { "Lovable-API-Key": key() },
    body: form,
  });
  if (!res.ok) throw new Error(`Transcription failed [${res.status}]: ${await res.text()}`);
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

const SYSTEM = `Aap "Kennedy" restaurant (Moon Grill Narowal) ke Urdu bolne wale voice waiter hain.
Hamesha ROMAN URDU / URDU mein jawab dein, garmjoshi aur chhote jumlon ke sath (zyada se zyada 45 alfaz).
Kaam: menu samjhana, taajweez dena, aur order lena (item, quantity, address, phone).
Order mukammal hone par short confirmation dein aur total Rs mein batayein.

MENU:
${MENU_TEXT}`;

export async function reply(history: VoiceTurn[], userText: string) {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key() },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: SYSTEM },
        ...history.slice(-8),
        { role: "user", content: userText },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Chat failed [${res.status}]: ${await res.text()}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "Maaf kijiye, dobara farmaiye.";
}

export async function speak(text: string) {
  const res = await fetch(`${GATEWAY}/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key() },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini-tts",
      input: text,
      voice: "alloy",
      response_format: "mp3",
      instructions: "Speak warm, friendly Urdu with natural Pakistani pronunciation.",
    }),
  });
  if (!res.ok) throw new Error(`TTS failed [${res.status}]: ${await res.text()}`);
  return bytesToBase64(await res.arrayBuffer());
}
