export default function handler(req, res) {
  res.json({
    voice_full: process.env.MINIMAX_VOICE_ID,
    group: process.env.MINIMAX_GROUP_ID,
    hasKey: !!process.env.MINIMAX_API_KEY,
  });
}
