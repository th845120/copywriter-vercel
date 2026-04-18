import type { Express } from "express";
import { createServer, type Server } from "http";

const OPENAI_KEY = process.env.OPENAI_API_KEY!;
const MINIMAX_KEY = process.env.MINIMAX_API_KEY!;
const MINIMAX_GROUP = process.env.MINIMAX_GROUP_ID!;
const MINIMAX_VOICE = process.env.MINIMAX_VOICE_ID!;

export function registerRoutes(app: Express): Server {
  // ── POST /api/generate — OpenAI GPT-4o-mini ──
  app.post("/api/generate", async (req, res) => {
    const { productName, features, extraReq, samples } = req.body;
    if (!productName || !features || !samples) {
      return res.status(400).json({ error: "缺少必填欄位" });
    }

    const featureList = (features as string[]).filter(Boolean).join("\n");
    const sampleText = (samples as string[])
      .filter((s) => s && s.length >= 20)
      .map((s, i) => `範本${i + 1}：\n${s}`)
      .join("\n\n");
    const extraNote =
      extraReq && extraReq.trim()
        ? `\n額外需求：${extraReq.trim()}`
        : "";

    const prompt = `你是一位專業的廣告旁白文案寫手。

請根據以下資訊，仿照「風格參考文案」的語氣、句型結構、斷句節奏，為產品撰寫一篇約288字的廣告旁白文案。

產品名稱：${productName}

產品特點：
${featureList}${extraNote}

風格參考文案：
${sampleText}

要求：
1. 仿照參考文案的說話風格，像真人旁白一樣口語自然
2. 不要用列點，用流暢的段落
3. 約288字，適合1分鐘影片旁白
4. 直接輸出文案本文，不要加任何說明或標題`;

    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.8,
          max_tokens: 800,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const json = await resp.json() as any;
      if (!resp.ok) throw new Error(json.error?.message || "OpenAI 錯誤");
      const text = json.choices?.[0]?.message?.content?.trim() || "";
      res.json({ text });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/tts — MiniMax TTS ──
  app.post("/api/tts", async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "缺少 text" });

    try {
      const resp = await fetch(
        `https://api.minimax.io/v1/t2a_v2?GroupId=${MINIMAX_GROUP}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${MINIMAX_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "speech-02-hd",
            text,
            voice_setting: {
              voice_id: MINIMAX_VOICE,
              speed: 1.0,
              vol: 1.0,
              pitch: 0,
            },
            output_format: "hex",
          }),
        }
      );
      const json = await resp.json() as any;
      if (json.base_resp?.status_code !== 0)
        throw new Error(json.base_resp?.status_msg || "MiniMax 錯誤");

      // hex → binary → send as mp3
      const hex: string = json.data.audio;
      const buf = Buffer.from(hex, "hex");
      res.set("Content-Type", "audio/mpeg");
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
