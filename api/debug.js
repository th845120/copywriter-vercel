export default function handler(req, res) {
  res.json({
    voice: process.env.MINIMAX_VOICE_ID?.slice(0, 20) + "...",
    group: process.env.MINIMAX_GROUP_ID,
    hasKey: !!process.env.MINIMAX_API_KEY,
  });
}
