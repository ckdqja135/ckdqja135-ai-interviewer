import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import { chat } from '../services/gemini';

const router = Router();
const promptsDir = path.join(__dirname, '../../prompts');
const uploadsDir = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

// Store resume text per session (simple in-memory store)
const resumeStore: Record<string, string> = {};

// GET /prompts - list all prompt files
router.get('/prompts', (_req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(promptsDir).filter((f) => f.endsWith('.md'));

    const prompts = files.map((file) => {
      const content = fs.readFileSync(path.join(promptsDir, file), 'utf-8');
      const id = file.replace('.md', '');

      // Extract first # heading
      const headingMatch = content.match(/^#\s+(.+)$/m);
      const name = headingMatch ? headingMatch[1] : id;

      return { id, name, content };
    });

    res.json(prompts);
  } catch (error) {
    console.error('Error reading prompts:', error);
    res.status(500).json({ error: 'Failed to read prompts' });
  }
});

// POST /upload-resume - upload a PDF resume and extract text
router.post('/upload-resume', upload.single('resume'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }

  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const resumeText = pdfData.text;

    // Generate a simple session ID
    const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    resumeStore[sessionId] = resumeText;

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({ sessionId, textLength: resumeText.length });
  } catch (error) {
    console.error('Error parsing PDF:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to parse PDF' });
  }
});

// POST /chat - stream chat response via SSE
router.post('/chat', async (req: Request, res: Response) => {
  const { promptType, promptId, messages, sessionId } = req.body as {
    promptType?: string;
    promptId?: string;
    messages: Array<{ role: string; content: string }>;
    sessionId?: string;
  };

  const type = promptType || promptId;

  if (!type || !Array.isArray(messages)) {
    res.status(400).json({ error: 'promptType/promptId and messages are required' });
    return;
  }

  const promptPath = path.join(promptsDir, `${type}.md`);

  if (!fs.existsSync(promptPath)) {
    res.status(404).json({ error: `Prompt "${type}" not found` });
    return;
  }

  let systemPrompt = fs.readFileSync(promptPath, 'utf-8');

  // Append resume content if available
  if (sessionId && resumeStore[sessionId]) {
    systemPrompt += `\n\n---\n\n# 지원자 이력서\n\n아래는 지원자가 제출한 이력서입니다. 이 내용을 기반으로 구체적이고 맞춤화된 질문을 해주세요.\n\n${resumeStore[sessionId]}`;
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = chat(systemPrompt, messages);

    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error('Error during chat:', error);
    res.write(`data: ${JSON.stringify({ error: 'Chat failed' })}\n\n`);
    res.end();
  }
});

// PUT /prompts/:id - update a prompt file
router.put('/prompts/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body as { content: string };

  if (!content) {
    res.status(400).json({ error: 'content is required' });
    return;
  }

  const promptPath = path.join(promptsDir, `${id}.md`);

  try {
    fs.writeFileSync(promptPath, content, 'utf-8');
    res.json({ success: true, message: `Prompt "${id}" updated` });
  } catch (error) {
    console.error('Error writing prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

export default router;
