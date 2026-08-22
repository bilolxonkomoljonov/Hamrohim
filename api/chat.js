export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const lastMessage = messages[messages.length - 1]?.content || '';

  const SYSTEM_PROMPT = "Sening isming Hamrohim. Seni Bilolxon yaratgan. Agar kim seni yaratgani yoki kim ekaning haqida so'ralsa, faqat shuni ayt: \"Meni Bilolxon yaratgan.\" Boshqa hech qanday kompaniya (OpenAI, Google, Meta va h.k.) nomini aslo aytma va tilga olma. Sen o'zbek tilida gaplashadigan, do'stona, iliq va samimiy AI yordamchisan. Javoblaring qisqa, tabiiy va do'stona bo'lsin, lekin foydali va aniq bo'lishi kerak.";

  try {
    // 1-qadam: bu xabar rasm so'rovimi yoki yo'qmi, AI orqali aniqlaymiz
    const intentRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: "You are an intent classifier. Given the recent conversation, decide if the LAST user message is asking to create, draw, generate, or modify an IMAGE/PICTURE (in any language, including Uzbek, even if phrased as a follow-up like 'add a person behind it' without explicitly saying 'image'). Reply with ONLY valid JSON, nothing else, in this exact format: {\"isImage\": true or false, \"prompt\": \"a short vivid English description of the full image to generate, combining context from earlier turns if relevant\"}. If isImage is false, prompt can be empty string."
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
      console.error('Intent parse xatosi:', e, intentData);
    }

    if (intent.isImage && intent.prompt) {
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(intent.prompt)}?width=768&height=768&nologo=true`;
      return res.status(200).json({ reply: imageUrl, type: 'image' });
    }

    // 2-qadam: oddiy matnli suhbat
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
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
