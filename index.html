export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const lastMessage = (messages[messages.length - 1]?.content || '').toLowerCase();

  const imageKeywords = ['rasm chiz', 'rasm yarat', 'rasm sol', 'surat chiz', 'surat yarat'];
  const matchedKeyword = imageKeywords.find(kw => lastMessage.includes(kw));

  if (matchedKeyword) {
    let prompt = lastMessage.replace(matchedKeyword, '').trim();
    if (!prompt) prompt = 'beautiful art';

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true`;

    return res.status(200).json({ reply: imageUrl, type: 'image' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content: "Sening isming Hamrohim. Seni Bilolxon yaratgan. Agar kim seni yaratgani yoki kim ekaning haqida so'ralsa, faqat shuni ayt: \"Meni Bilolxon yaratgan.\" Boshqa hech qanday kompaniya (OpenAI, Google, Meta va h.k.) nomini aslo aytma va tilga olma. Sen o'zbek tilida gaplashadigan, do'stona, iliq va samimiy AI yordamchisan. Javoblaring qisqa, tabiiy va do'stona bo'lsin, lekin foydali va aniq bo'lishi kerak."
          },
          ...messages
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API xatosi:', data);
      return res.status(500).json({ error: data.error?.message || 'Groq API xatosi' });
    }

    const reply = data.choices?.[0]?.message?.content || "Kechirasan, javob topilmadi.";
    res.status(200).json({ reply, type: 'text' });
  } catch (err) {
    console.error('Server xatosi:', err);
    res.status(500).json({ error: 'Server xatosi: ' + err.message });
  }
}
