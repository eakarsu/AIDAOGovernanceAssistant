const https = require('https');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// 3-strategy JSON parsing: extract from fences/text, fix quotes & python-isms, repair truncation
function parseAIJson(text) {
  if (!text) return null;
  // Strategy 1: direct parse
  try { return JSON.parse(text); } catch {}

  // Strategy 2: extract first {...} block, fix python-style booleans/single quotes
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    let extracted = text.substring(firstBrace, lastBrace + 1);
    try { return JSON.parse(extracted); } catch {}
    let fixed = extracted
      .replace(/:\s*True\b/g, ': true')
      .replace(/:\s*False\b/g, ': false')
      .replace(/:\s*None\b/g, ': null')
      .replace(/'/g, '"');
    try { return JSON.parse(fixed); } catch {}

    // Strategy 3: repair truncated JSON by closing open brackets
    try {
      let repaired = fixed.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/, '').replace(/,\s*$/, '');
      const opens = (repaired.match(/\{/g) || []).length;
      const closes = (repaired.match(/\}/g) || []).length;
      const openBrk = (repaired.match(/\[/g) || []).length;
      const closeBrk = (repaired.match(/\]/g) || []).length;
      for (let i = 0; i < openBrk - closeBrk; i++) repaired += ']';
      for (let i = 0; i < opens - closes; i++) repaired += '}';
      return JSON.parse(repaired);
    } catch {}
  }
  return null;
}

async function callOpenRouter(systemPrompt, userPrompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = options.model || process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

  const payload = JSON.stringify({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: options.maxTokens || 2000,
    temperature: options.temperature ?? 0.7
  });

  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI DAO Governance Assistant'
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'OpenRouter API error'));
          } else {
            const content = parsed.choices?.[0]?.message?.content || 'No response generated';
            resolve({
              content,
              model: parsed.model,
              usage: parsed.usage
            });
          }
        } catch (e) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { callOpenRouter, parseAIJson };
