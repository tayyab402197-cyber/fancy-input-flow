import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { transcribe, reply, speak, type VoiceTurn } from "./voice.server";

const VoiceInput = z.object({
  audioBase64: z.string().min(1),
  mime: z.string().min(1),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .default([]),
});

export const voiceOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => VoiceInput.parse(input))
  .handler(async ({ data }) => {
    const transcript = await transcribe(data.audioBase64, data.mime);
    if (!transcript) {
      return { transcript: "", text: "Awaz saaf nahi aayi, dobara koshish karein.", audio: "" };
    }
    const text = await reply(data.history as VoiceTurn[], transcript);
    const audio = await speak(text);
    return { transcript, text, audio };
  });
