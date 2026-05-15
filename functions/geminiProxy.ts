const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') || '';

async function callGemini(url: string, body: object) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }
  return res.json();
}

async function callGroq(messages: object[], model = 'llama-3.3-70b-versatile', jsonMode = false) {
  const body: any = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 4096,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function createWavBase64(pcmData: Uint8Array, sampleRate = 24000): string {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, pcmData.length, true);
  const combined = new Uint8Array(44 + pcmData.length);
  combined.set(new Uint8Array(header), 0);
  combined.set(pcmData, 44);
  let binary = '';
  for (let i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i]);
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, ...params } = body;

    // ── GENERATE IMAGE (Gemini) ──────────────────────────────────────────────
    if (action === 'generateImage') {
      const { prompt, aspectRatio = '1:1' } = params;
      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
      const cinematicPrompt = `Professional cinematic photography, ${prompt}, 8k resolution, volumetric lighting, golden hour, master composition, deep depth of field, hyper-realistic.`;
      const data = await callGemini(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent`,
        {
          contents: [{ parts: [{ text: cinematicPrompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }
      );
      const parts = data?.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) return Response.json({ imageBase64: `data:image/png;base64,${part.inlineData.data}` });
      }
      throw new Error('No image generated');
    }

    // ── EDIT IMAGE (Gemini) ─────────────────────────────────────────────────
    if (action === 'editImage') {
      const { imageBase64, editPrompt } = params;
      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      const data = await callGemini(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent`,
        {
          contents: [{ parts: [{ inlineData: { mimeType: 'image/png', data: cleanBase64 } }, { text: `Edit this image: ${editPrompt}. Maintain cinematic quality.` }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }
      );
      const parts = data?.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData) return Response.json({ imageBase64: `data:image/png;base64,${part.inlineData.data}` });
      }
      throw new Error('No image returned');
    }

    // ── TEXT TO SPEECH (Gemini) ─────────────────────────────────────────────
    if (action === 'textToSpeech') {
      const { text, voiceName = 'Kore', style = 'neutral', speed = 'normal' } = params;
      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
      const stylePrompt = `Style: ${style}, Speed: ${speed}. Speak this clearly: ${text}`;
      const data = await callGemini(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`,
        {
          contents: [{ parts: [{ text: stylePrompt }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          },
        }
      );
      const base64Audio = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error('No audio generated');
      const pcmBytes = decode(base64Audio);
      const wavBase64 = createWavBase64(pcmBytes, 24000);
      return Response.json({ audioBase64: `data:audio/wav;base64,${wavBase64}` });
    }

    // ── RESEARCH (Groq — free) ──────────────────────────────────────────────
    if (action === 'research') {
      const { query } = params;
      if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');
      const text = await callGroq([
        {
          role: 'system',
          content: 'You are a smart research assistant. Answer questions thoroughly with facts, details, and structure. If the question is in Arabic, answer in Arabic. If in English, answer in English.',
        },
        { role: 'user', content: `Research and provide a detailed, well-structured answer about: ${query}` },
      ]);
      return Response.json({ text, sources: [] });
    }

    // ── STORYBRAND SB7 (Groq — free) ───────────────────────────────────────
    if (action === 'analyzeSB7') {
      const { input } = params;
      if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');
      const text = await callGroq(
        [
          {
            role: 'system',
            content: `You are a StoryBrand SB7 framework expert. Analyze the given input and return ONLY valid JSON in this exact structure:
{
  "clarityScore": <number 0-100>,
  "elements": {
    "hero": { "title": "البطل", "score": <0-100>, "analysis": "<text>", "suggestions": ["<tip1>","<tip2>"], "status": "<success|warning|error>" },
    "problem": { "title": "المشكلة", "score": <0-100>, "analysis": "<text>", "suggestions": ["<tip>"], "status": "<success|warning|error>" },
    "guide": { "title": "المرشد", "score": <0-100>, "analysis": "<text>", "suggestions": ["<tip>"], "status": "<success|warning|error>" },
    "plan": { "title": "الخطة", "score": <0-100>, "analysis": "<text>", "suggestions": ["<tip>"], "status": "<success|warning|error>" },
    "cta": { "title": "الدعوة للتصرف", "score": <0-100>, "analysis": "<text>", "suggestions": ["<tip>"], "status": "<success|warning|error>" },
    "failure": { "title": "الفشل المحتمل", "score": <0-100>, "analysis": "<text>", "suggestions": ["<tip>"], "status": "<success|warning|error>" },
    "success": { "title": "النجاح", "score": <0-100>, "analysis": "<text>", "suggestions": ["<tip>"], "status": "<success|warning|error>" }
  }
}
Respond in the same language as the input (Arabic or English).`,
          },
          { role: 'user', content: input },
        ],
        'llama-3.3-70b-versatile',
        true
      );
      return Response.json({ result: JSON.parse(text) });
    }

    // ── SCRIPT STUDIO (Groq — free) ─────────────────────────────────────────
    if (action === 'generateScript') {
      const { topic } = params;
      if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');
      const text = await callGroq(
        [
          {
            role: 'system',
            content: `You are a professional cinematic screenwriter. Write a 5-scene script and return ONLY valid JSON array:
[
  {
    "title": "<scene title>",
    "shotType": "<e.g. Medium Shot, Close-Up, Wide Shot>",
    "cameraAngle": "<e.g. Eye Level, Low Angle, Bird's Eye>",
    "description": "<detailed scene description>",
    "dialogue": "<character dialogue>",
    "notes": "<director notes>"
  }
]
Write in the same language as the topic (Arabic or English).`,
          },
          { role: 'user', content: `Write a cinematic script about: ${topic}` },
        ],
        'llama-3.3-70b-versatile',
        true
      );
      // Groq json_object mode returns an object, handle both array and wrapped
      let parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return Response.json({ scenes: parsed });
      // sometimes wrapped in a key
      const key = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
      return Response.json({ scenes: key ? parsed[key] : [] });
    }

    // ── THUMBNAIL CONCEPTS (Groq — free) ────────────────────────────────────
    if (action === 'thumbnailConcepts') {
      const { prompt } = params;
      if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');
      const text = await callGroq(
        [
          {
            role: 'system',
            content: `You are a viral YouTube thumbnail expert. Generate 3 thumbnail concepts and return ONLY valid JSON:
{
  "concepts": [
    { "trigger": "<psychological trigger>", "title": "<bold main text>", "desc": "<visual description of thumbnail>" }
  ]
}`,
          },
          { role: 'user', content: `Create 3 viral thumbnail concepts for: ${prompt}` },
        ],
        'llama-3.3-70b-versatile',
        true
      );
      const parsed = JSON.parse(text);
      return Response.json({ concepts: parsed.concepts || [] });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
