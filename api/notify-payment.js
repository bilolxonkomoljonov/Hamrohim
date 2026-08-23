export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plan } = req.body;
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Sessiya tugagan' });
    const user = await userRes.json();

    const planNames = { premium: "Premium (300 000 so'm)", vip: "VIP (500 000 so'm)" };
    const text = `💰 Yangi to'lov so'rovi!\n\n👤 Email: ${user.email}\n📦 Tarif: ${planNames[plan] || plan}\n\nTasdiqlash uchun Supabase'da uning tarifini o'zgartiring.`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text })
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Xatolik' });
  }
}
