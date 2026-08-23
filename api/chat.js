export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, lang } = req.body;
  const isEnglish = lang === 'en';
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Auth required', type: 'auth_required' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  let user;
  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
    });
    if (!userRes.ok) return res.status(401).json({ error: 'Session expired', type: 'auth_required' });
    user = await userRes.json();
  } catch (e) {
    return res.status(500).json({ error: 'Auth error' });
  }

  let profile;
  try {
    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${user.id}&select=*`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
    });
    const profiles = await profileRes.json();
    profile = profiles[0];
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
  } catch (e) {
    return res.status(500).json({ error: 'Profile fetch error' });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (profile.last_reset_date !== today) {
    profile.messages_used_today = 0;
    profile.images_used_today = 0;
    profile.last_reset_date = today;
    await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal'
      },
      body: JSON.stringify({ messages_used_today: 0, images_used_today: 0, last_reset_date: today })
    });
  }

  const LIMITS = {
    free: { messages: 25, images: 7 },
    premium: { messages: 150, images: 20 },
    vip: { messages: 1000, images: 100 },
    admin: { messages: 999999, images: 999999 }
  };
  const limits = LIMITS[profile.plan] || LIMITS.free;

  const SYSTEM_PROMPT = isEnglish
    ? "Your name is Hamrohim. You were created by Bilolxon. If someone asks who created you or who you are, only say: \"I was created by Bilolxon.\" Never mention any company (OpenAI, Google, Meta, etc). You are a friendly, warm AI companion. Respond in English. Keep answers concise, natural, and friendly, but helpful and clear."
    : "Sening isming Hamrohim. Seni Bilolxon yaratgan. Agar kim seni yaratgani yoki kim ekaning haqida so'ralsa, faqat shuni ayt: \"Meni Bilolxon yaratgan.\" Boshqa hech qanday kompaniya (OpenAI, Google, Meta va h.k.) nomini aslo aytma va tilga olma. Sen o'zbek tilida gaplashadigan, do'stona, iliq va samimiy AI yordamchisan. Javoblaring qisqa, tabiiy va do'stona bo'lsin, lekin foydali va aniq bo'lishi kerak.";

  async function incrementUsage(field) {
    await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${user.id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json', Prefer: 'return=minimal'
      },
      body: JSON.stringify({ [field]: profile[field] + 1 })
    });
  }

  try {
    const intentRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content: "You are an intent classifier. Given the recent conversation, decide if the LAST user message is asking to create, draw, generate, or modify an IMAGE/PICTURE (in any language, even if phrased as a follow-up like 'add a person behind it' without explicitly saying 'image'). Reply with ONLY valid JSON, nothing else, in this exact format: {\"isImage\": true or false, \"prompt\": \"a detailed, complete English description of the full image, including EVERY single detail, object, action, and modifier mentioned by the user across the whole conversation — do not omit or summarize away any detail, even small ones like objects held in hands, background elements, or accessories\"}. If isImage is false, prompt can be empty string."
          },
          ...messages.slice(-6)
        ]
      })
    });
    const intentData = await intentRes.json();
    let intent = { isImage: false, prompt: '' };
    try {
      const raw = intentData.choices?.[0]?.message?.content?.trim() || '{}';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      intent = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch (e) {
      console.error('Intent parse error:', e, intentData);
    }

    if (intent.isImage && intent.prompt) {
      if (profile.images_used_today >= limits.images) {
        return res.status(200).json({
          type: 'limit', limitType: 'image',
          reply: isEnglish ? "Your daily image limit is over." : "Bugungi rasm yaratish limitingiz tugadi."
        });
      }
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(intent.prompt)}?width=768&height=768&nologo=true`;
      await incrementUsage('images_used_today');
      return res.status(200).json({ reply: imageUrl, type: 'image' });
    }

    if (profile.messages_used_today >= limits.messages) {
      return res.status(200).json({
        type: 'limit', limitType: 'message',
        reply: isEnglish ? "Your daily message limit is over." : "Bugungi xabar limitingiz tugadi."
      });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [ { role: 'system', content: SYSTEM_PROMPT }, ...messages ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Groq API error:', data);
      return res.status(500).json({ error: data.error?.message || 'Groq API error' });
    }

    const reply = data.choices?.[0]?.message?.content || (isEnglish ? "Sorry, no reply." : "Kechirasan, javob topilmadi.");
    await incrementUsage('messages_used_today');
    res.status(200).json({ reply, type: 'text' });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
