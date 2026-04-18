// AI Chat Assistant using Gemini 1.5 Flash

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Sends a chat message to Gemini with opportunity context.
 * Returns the AI's response text.
 */
export async function sendChatMessage(
  userMessage: string,
  opportunities: any[],
  chatHistory: Message[] = []
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string;
  console.log('[ChatAI] API key present:', !!apiKey);
  if (!apiKey) {
    return '⚠️ AI assistant unavailable. Please set VITE_GEMINI_API_KEY in your .env.local file.';
  }

  // Limit context to top 5 opportunities for performance
  const topOpps = opportunities.slice(0, 5);
  const oppContext = topOpps.length > 0
    ? topOpps.map((o, i) => `${i + 1}. ${o.title} by ${o.ngoName} (${o.location}) - Skills: ${(o.requiredSkills || []).join(', ')}`).join('\n')
    : 'No opportunities available.';

  const systemPrompt = `You are a helpful volunteer coordinator assistant for ServeSync.
You help volunteers find the best opportunities to contribute their skills.

Available opportunities:
${oppContext}

Be concise, friendly, and suggest relevant opportunities based on the user's question.`;

  // Build conversation history for context
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    ...chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      }
    );

    if (!res.ok) {
      console.error('[ChatAI] Gemini error:', res.status, await res.text());
      return "Sorry, I'm having trouble connecting right now. Please try again.";
    }

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';

    if (!text) {
      console.warn('[ChatAI] Empty response from Gemini');
      return "I couldn't generate a response. Please try rephrasing your question.";
    }

    console.log('[ChatAI] Response generated:', text.substring(0, 100) + '...');
    return text;
  } catch (err) {
    console.error('[ChatAI] Fetch failed:', err);
    return "Network error. Please check your connection and try again.";
  }
}
