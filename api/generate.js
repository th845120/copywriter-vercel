const SOCIAL_EXAMPLES = `---
一尾不到4元甜蝦瀑布看過沒？
爆搶便宜價 ➡️ [連結]

壽司店一貫 $30，這盤一尾不到 4 塊錢
解凍即食，生食刺身等級
每一口都是爆發的鮮蝦甘甜味

整整50尾入(約115g/盒)，真的只要$199
這滿滿一大盤絕對讓你吃過癮
想吃甜蝦？別再怕荷包失血
直接在家自製超豪華滿滿甜蝦丼吧
火速下單 [連結]
#生食級去殼小甜蝦 #50尾只要199
---
玉荷包的產季又來了！
預訂網址 ➡️ [連結]

外銷頂級32mm規格(去枝去葉)，
每粒飽滿爆汁，甜度高達20度💦

四月就有很多老客人預訂了，產量有限，
建議想吃的朋友提早預訂哦

📍訂1箱-單箱下殺$990元
📍訂2箱-單箱下殺$950元
📍買越多箱越划算，送禮自用兩相宜

預訂網址 ➡️ [連結]
#玉荷包 #當季限定
---
SHARP《森呼吸 NEXT》獨家販售
售完即止 ➡️ [連結]

全新配色登場，限量販售🔥

🌿異味淨化｜獨家自動除菌離子技術
🌿15坪循環｜小巧機身大空間快速循環
🌿清洗方便｜前罩後罩扇葉可拆卸清洗
🌿靜音運轉｜大風量小聲音
🌿質感風格｜日系百搭空間

再不快要沒了 ➡️ [連結]
#森呼吸NEXT #限量配色
---
正式開賣！追覓 FP10 汪牌大濾師
搶第一批出貨 👉🏻 [連結]

全新『濾網自清潔』強勢登場！

🏆 360°自清潔｜維持高效淨化
🏆 強力吸毛｜空中浮毛全部吸入
🏆 大容量集毛倉｜毛滿提醒輕鬆倒
🏆 6重淨化｜H13濾網UVC負離子
🏆 新一級能效｜開整天只耗1度電

超早鳥優惠，下單再送好禮
搶第一批出貨 👉🏻 [連結]
#濾網不卡毛 #不用動手清
---`;

async function callOpenAI(key, prompt, temperature, max_tokens) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature,
      max_tokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error?.message || "OpenAI 錯誤");
  return json.choices?.[0]?.message?.content?.trim() || "";
}

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

  try {
    // ── Step 1：並行分析兩種風格 ──
    const [videoStyleAnalysis, socialStyleAnalysis] = await Promise.all([
      callOpenAI(
        OPENAI_KEY,
        `你是文案分析師。請針對以下【風格參考文案】進行深度分析。
分析重點包含：整體風格、語氣與措辭特色、句型結構、斷句節奏、情感調性、常用詞彙模式。
目的是讓我在後續能精準模仿這樣的口吻撰稿。

【風格參考文案】
${sampleText}

請輸出結構清晰的分析報告，不需要標題裝飾，直接條列重點。`,
        0.3,
        600
      ),
      callOpenAI(
        OPENAI_KEY,
        `你是文案分析師。請針對以下【臉書社群貼文範例】進行深度分析。
分析重點包含：開頭鉤句的寫法、call to action 的位置與措辭、條列特點的格式與 emoji 使用習慣、空行節奏、hashtag 的安排方式、整體語氣與口吻。
目的是讓我在後續能精準模仿這樣的格式與風格撰寫新貼文。

【臉書社群貼文範例】
${SOCIAL_EXAMPLES}

請輸出結構清晰的分析報告，不需要標題裝飾，直接條列重點。`,
        0.3,
        600
      ),
    ]);

    // ── Step 2：用分析結果串行生成兩份文案 ──
    const videoText = await callOpenAI(
      OPENAI_KEY,
      `你是一位專業的廣告旁白文案寫手。

根據以下【風格分析】，為產品撰寫一篇約288字的廣告旁白文案。

【風格分析】
${videoStyleAnalysis}

【產品資訊】
產品名稱：${productName}
產品特點：
${featureList}${extraNote}

要求：
1. 完全按照風格分析的語氣、句型、斷句節奏撰寫
2. 不要用列點，用流暢的段落
3. 約288字，適合1分鐘影片旁白
4. 直接輸出文案本文，不要加任何說明或標題`,
      0.8,
      800
    );

    const socialRaw = await callOpenAI(
      OPENAI_KEY,
      `你是一位專業的臉書社群文案寫手。

根據以下【社群文案風格分析】，為產品撰寫2則不同版本的臉書發文文案。

【社群文案風格分析】
${socialStyleAnalysis}

【產品資訊】
產品名稱：${productName}
產品特點：
${featureList}${extraNote}

格式規則（嚴格遵守）：
1. 開頭第一句：提問句或讓人好奇的結論（不超過22字元）
2. 第二行：call to action + [連結]
3. 第二行後空一行
4. 中段：條列產品特點，每行加 emoji，每行嚴格不超過22字元
5. 條列後空一行
6. 倒數第二行：call to action + [連結]
7. 最後一行：hashtag，單獨一行，不和 call to action 同行
8. 禁止把 call to action 和 hashtag 寫在同一行

《格式模板》
開頭提問或好奇結論
call to action + [連結]

emoji+特點（不超過22字）
emoji+特點
emoji+特點

call to action + [連結]
#hashtag1 #hashtag2

請輸出 JSON 格式：
{"v1": "第一則完整文案", "v2": "第二則完整文案"}

只輸出 JSON，不要加任何說明。`,
      0.85,
      1000
    );

    let socialV1 = "", socialV2 = "";
    try {
      const parsed = JSON.parse(socialRaw.replace(/^```json\n?|```$/g, "").trim());
      socialV1 = parsed.v1 || "";
      socialV2 = parsed.v2 || "";
    } catch (e) {
      socialV1 = socialRaw;
    }

    res.json({ text: videoText, social: { v1: socialV1, v2: socialV2 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
