export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { productName, features, extraReq, samples } = req.body;
  if (!productName || !features || !samples) {
    return res.status(400).json({ error: "缺少必填欄位" });
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

  const featureList = features.filter(Boolean).join("\n");
  const sampleText = samples
    .filter((s) => s && s.length >= 20)
    .map((s, i) => `範本${i + 1}：\n${s}`)
    .join("\n\n");
  const extraNote = extraReq && extraReq.trim() ? `\n額外需求：${extraReq.trim()}` : "";

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
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error?.message || "OpenAI 錯誤");
    const text = json.choices?.[0]?.message?.content?.trim() || "";
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
