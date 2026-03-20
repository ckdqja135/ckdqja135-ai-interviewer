import { Ollama } from 'ollama';

const ollama = new Ollama({ host: 'http://localhost:11434' });

export interface ChatMessage {
  role: string;
  content: string;
}

export async function* chat(
  systemPrompt: string,
  messages: ChatMessage[]
): AsyncGenerator<string> {
  const fullMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages,
  ];

  const response = await ollama.chat({
    model: 'gemma3:4b',
    messages: fullMessages,
    stream: true,
  });

  for await (const chunk of response) {
    if (chunk.message?.content) {
      yield chunk.message.content;
    }
  }
}

export async function getModels() {
  const response = await ollama.list();
  return response.models;
}
