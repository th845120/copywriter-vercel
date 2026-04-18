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

  const videoPrompt = `你是一位專業的廣告旁白文案寫手。

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

  const socialPrompt = `你是一位專業的臉書社群文案寫手。

請根據以下產品資訊，仿照以下4篇範例的風格與格式，撰寫2則不同版本的臉書發文文案。

產品名稱：${productName}
產品特點：
${featureList}${extraNote}

風格規則（嚴格遵守）：
1. 開頭第一句必須是提問句，或一個讓人好奇的結論
2. 第二行一定要有 call to action + 連結（用 [連結] 代替實際網址）
3. 中段條列產品特點，每個特點加 emoji，每行不超過22字元
4. 最後一行也要有 call to action + 連結（用 [連結] 代替實際網址）
5. 每行字數不超過22字元
6. 風格口語、有衝勁、接地氣
7. 可適當加入 hashtag

參考範例：
---
一尾不到4元甜蝦瀑布看過沒？
爆搶便宜價 ➡️ [連結]
#生食級去殼小甜蝦 50尾只要$199

-

壽司店一貫 $30，這盤一尾不到 4 塊錢
解凍即食，生食刺身等級
每一口都是爆發的鮮蝦甘甜味

-

整整50尾入(約115g/盒)，真的只要$199
這滿滿一大盤絕對讓你吃過癮
想吃甜蝦？別再怕荷包失血
直接在家自製超豪華滿滿甜蝦丼吧
火速下單 [連結]
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
---
SHARP《森呼吸 NEXT》獨家販售
售完即止 ➡️ [連結]

全新配色登場，限量販售🔥

核心亮點：
🌿異味淨化｜獨家自動除菌離子技術
🌿15坪循環｜小巧機身大空間快速循環
🌿清洗方便｜前罩後罩扇葉可拆卸清洗
🌿靜音運轉｜大風量小聲音
🌿質感風格｜日系百搭空間

再不快要沒了 ➡️ [連結]
---
正式開賣！追覓 FP10 汪牌大濾師
搶第一批出貨 👉🏻 [連結]

全新『濾網自清潔』強勢登場！
#濾網不卡毛 #不用動手清

超強特色：
🏆 360°自清潔｜維持高效淨化
🏆 強力吸毛｜空中浮毛全部吸入
🏆 大容量集毛倉｜毛滿提醒輕鬆倒
🏆 6重淨化｜H13濾網UVC負離子
🏆 新一級能效｜開整天只耗1度電

超早鳥優惠，下單再送好禮
搶第一批出貨 👉🏻 [連結]
---

請輸出 JSON 格式，包含兩個版本：
{"v1": "第一則完整文案", "v2": "第二則完整文案"}

只輸出 JSON，不要加任何說明。`;

  try {
    // 並行呼叫兩個 prompt
    const [videoResp, socialResp] = await Promise.all([
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.8,
          max_tokens: 800,
          messages: [{ role: "user", content: videoPrompt }],
        }),
      }),
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.85,
          max_tokens: 1000,
          messages: [{ role: "user", content: socialPrompt }],
        }),
      }),
    ]);

    const [videoJson, socialJson] = await Promise.all([
      videoResp.json(),
      socialResp.json(),
    ]);

    if (!videoResp.ok) throw new Error(videoJson.error?.message || "OpenAI 影片文案錯誤");
    if (!socialResp.ok) throw new Error(socialJson.error?.message || "OpenAI 社群文案錯誤");

    const videoText = videoJson.choices?.[0]?.message?.content?.trim() || "";

    let socialV1 = "", socialV2 = "";
    try {
      const raw = socialJson.choices?.[0]?.message?.content?.trim() || "{}";
      const parsed = JSON.parse(raw.replace(/^```json\n?|```$/g, "").trim());
      socialV1 = parsed.v1 || "";
      socialV2 = parsed.v2 || "";
    } catch (e) {
      socialV1 = socialJson.choices?.[0]?.message?.content?.trim() || "";
    }

    res.json({ text: videoText, social: { v1: socialV1, v2: socialV2 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
