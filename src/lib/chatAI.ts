import { callGemini } from './geminiClient';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(
  userMessage: string,
  opportunities: any[],
  chatHistory: Message[] = [],
  userRole: 'volunteer' | 'ngo' | 'admin' = 'volunteer'
): Promise<string> {
  const topOpps = opportunities.slice(0, 5);
  const oppContext = topOpps.length > 0
    ? topOpps.map((o, i) => `${i + 1}. ${o.title} by ${o.ngoName} (${o.location}) - Skills: ${(o.requiredSkills || []).join(', ')}`).join('\n')
    : 'No opportunities available.';

  const roleContext = userRole === 'ngo'
    ? `You are helping an NGO user. Help them post opportunities, find volunteers, manage their profile, and use the verification system.`
    : `You are helping a volunteer. Help them find opportunities, connect with NGOs, and track their impact.`;

  const systemPrompt = `You are a helpful assistant for ServeSync, an AI-powered NGO-Volunteer matching platform.
${roleContext}

Current opportunities on the platform:
${oppContext}

Be concise, friendly, and specific. If asked how to find volunteers (for NGO) or opportunities (for volunteer), explain the platform features clearly.`;

  const contents = [
    { role: 'user' as const, parts: [{ text: systemPrompt }] },
    ...chatHistory.map(msg => ({
      role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      parts: [{ text: msg.content }],
    })),
    { role: 'user' as const, parts: [{ text: userMessage }] },
  ];

  try {
    const text = await callGemini({ contents });
    console.log('[ChatAI] Response:', text.substring(0, 80) + '...');
    return text;
  } catch (err) {
    console.error('[ChatAI] Error:', err);
    return "Sorry, I'm having trouble connecting right now. Please try again.";
  }
}
