/**
 * AI Provider Client
 * Supports Google Gemini API and OpenAI API with automatic fallback
 * to rule-based intelligence when keys are absent or services are unreachable.
 */

export const callAI = async ({ prompt, systemPrompt = '', responseFormat = 'json' }) => {
  const provider = process.env.AI_PROVIDER || 'gemini';
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  if (provider === 'gemini' && geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${prompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: responseFormat === 'json' ? 'application/json' : 'text/plain',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty AI response');

      return responseFormat === 'json' ? JSON.parse(rawText) : rawText;
    } catch (err) {
      console.warn(`[AI Provider] Gemini call failed (${err.message}). Using deterministic fallback engine.`);
      return null;
    }
  }

  if (provider === 'openai' && openAiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          response_format: responseFormat === 'json' ? { type: 'json_object' } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content;
      return responseFormat === 'json' ? JSON.parse(rawContent) : rawContent;
    } catch (err) {
      console.warn(`[AI Provider] OpenAI call failed (${err.message}). Using deterministic fallback engine.`);
      return null;
    }
  }

  // No active API key; return null to invoke high-precision fallback engine
  return null;
};
