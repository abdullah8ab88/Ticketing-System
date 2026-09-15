import { NextRequest, NextResponse } from 'next/server';

function isArabicText(text: string) {
  const arabicChars = (text.match(/[؀-ۿ]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  return arabicChars > latinChars;
}

export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text?: string };

  if (!text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const key = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';

  if (!key || !region) {
    return NextResponse.json({ error: 'Translator is not configured' }, { status: 501 });
  }

  const targetLang = isArabicText(text) ? 'en' : 'ar';

  const response = await fetch(`${endpoint}/translate?api-version=3.0&to=${targetLang}`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Ocp-Apim-Subscription-Region': region,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ Text: text }]),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Azure Translator error:', response.status, errorBody);
    return NextResponse.json({ error: 'Translation failed' }, { status: 502 });
  }

  const data = (await response.json()) as Array<{ translations: Array<{ text: string; to: string }> }>;
  const translatedText = data[0]?.translations?.[0]?.text;

  if (!translatedText) {
    return NextResponse.json({ error: 'Translation failed' }, { status: 502 });
  }

  return NextResponse.json({ translatedText, targetLang });
}
