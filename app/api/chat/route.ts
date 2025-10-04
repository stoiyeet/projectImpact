// app/api/chat/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import getAIPrompt from './prompt';

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY!,
});

export async function POST(req: Request) {
  try {
    // 1. Parse the incoming messages array
    const { messages } = await req.json();
    const userInput = messages[messages.length - 1]?.content || '';

    // 2. Load your custom AI prompt
    const AIPrompt = getAIPrompt();

    // 3. Call Gemini with both AI and user contexts
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: [userInput],
      config: {
        systemInstruction: AIPrompt,
      },
    });

    // 4. Return the assistant’s reply
    return NextResponse.json({ answer: response.text });
  } catch (err) {
    console.error('Gemini error:', err);
    return NextResponse.json(
      { answer: 'Sorry, maybe try again in a bit?' },
      { status: 500 }
    );
  }
}
