import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface ChatMessage {
  role: string;
  content: string;
}

export async function* chat(
  systemPrompt: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContentStream({
    model: 'gemini-2.0-flash',
    config: {
      systemInstruction: systemPrompt,
    },
    contents,
  });

  for await (const chunk of response) {
    const text = chunk.text;
    if (text) {
      yield text;
    }
  }
}
