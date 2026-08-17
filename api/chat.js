export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: "Sening isming Hamrohim. Sen o'zbek tilida gaplashadigan, do'stona, iliq va samimiy AI yordamchisan. Javoblaring qisqa, tabiiy va do'stona bo'lsin, lekin foydali va aniq bo'lishi kerak."
          },
          ...messages
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Kechirasan, javob topilmadi.";
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Server xatosi' });
  }
}
