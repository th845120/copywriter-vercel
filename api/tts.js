export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body;
  if (!text) return res.status(400).json({ error: "缺少 text" });

  const MINIMAX_KEY = process.env.MINIMAX_API_KEY;
  const MINIMAX_GROUP = process.env.MINIMAX_GROUP_ID;
  const MINIMAX_VOICE = process.env.MINIMAX_VOICE_ID;
  if (!MINIMAX_KEY || !MINIMAX_GROUP || !MINIMAX_VOICE) {
    return res.status(500).json({ error: "Missing MiniMax env vars" });
  }

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
    const json = await resp.json();
    if (json.base_resp?.status_code !== 0) {
      throw new Error(json.base_resp?.status_msg || "MiniMax 錯誤");
    }

    const hex = json.data.audio;
    const buf = Buffer.from(hex, "hex");
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
