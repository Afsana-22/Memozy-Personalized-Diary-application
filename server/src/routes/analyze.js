const express = require('express');
const axios = require('axios');
const Sentiment = require('sentiment');
const sentimentAnalyzer = new Sentiment();
const router = express.Router();

// Local fallback heuristic (keeps previous behaviour in case HF call fails)
function localAnalyze(text) {
  // Use the `sentiment` package for a more robust local fallback
  try {
    const r = sentimentAnalyzer.analyze(text || '');
    if (!r || typeof r.score !== 'number') return 'neutral';
    if (r.score >= 2) return 'happy';
    if (r.score === 1) return 'excited';
    if (r.score === 0) return 'neutral';
    return 'sad';
  } catch (e) {
    // If sentiment package fails for some reason, fall back to the simple heuristic
    const t = text.toLowerCase();
    const positive = ['happy','good','great','fantastic','love','joy','excited','amazing'];
    const negative = ['sad','bad','depressed','angry','hate','anxious','terrible','upset'];
    let score = 0;
    for (const p of positive) if (t.includes(p)) score += 1;
    for (const n of negative) if (t.includes(n)) score -= 1;
    if (score >= 2) return 'happy';
    if (score === 1) return 'excited';
    if (score === 0) return 'neutral';
    return 'sad';
  }
}

async function hfAnalyze(text) {
  const apiKey = process.env.HF_API_KEY || process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error('Hugging Face API key not set');

  // Use a sentiment model suitable for short texts. We will use the env override or default to
  // 'cardiffnlp/twitter-roberta-base-sentiment'. Caller can override by passing a model string.
  const model = arguments[1] || process.env.HF_SENTIMENT_MODEL || 'cardiffnlp/twitter-roberta-base-sentiment';

  const url = `https://api-inference.huggingface.co/models/${model}`;
  const resp = await axios.post(url, { inputs: text }, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  // Response can be an array of {label,score} or an object. Normalize it.
  const data = resp.data;
  // Log the raw response for debugging
  try { console.debug('HF response raw:', JSON.stringify(data)); } catch(e){ console.debug('HF response raw (non-json):', data); }
  // Some HF models return nested arrays like [[{label,score},...]] or [{label,score},...]
  if (Array.isArray(data)) {
    let arr = data;
    if (Array.isArray(data[0])) arr = data[0];
    if (Array.isArray(arr) && arr.length > 0 && arr[0].label) {
      // pick the highest-score label if provided
      const best = arr.reduce((a, b) => (a.score > b.score ? a : b));
      const labelRaw = String(best.label || '').toLowerCase();
      // handle LABEL_0 / LABEL_1 / LABEL_2 style mappings (common for some models)
      const m = labelRaw.match(/^label_(\d+)$/i);
      if (m) {
        const idx = parseInt(m[1], 10);
        // cardiffnlp/twitter-roberta-base-sentiment mapping: 0=negative,1=neutral,2=positive
        if (idx === 2) return 'happy';
        if (idx === 1) return 'neutral';
        if (idx === 0) return 'sad';
      }
      if (labelRaw.includes('positive') || labelRaw.includes('pos')) return 'happy';
      if (labelRaw.includes('negative') || labelRaw.includes('neg')) return 'sad';
      return 'neutral';
    }
  }

  // Some models return {label: 'POSITIVE', score: 0.99}
  if (data.label) {
    const label = String(data.label).toLowerCase();
    if (label.includes('positive') || label.includes('pos')) return 'happy';
    if (label.includes('negative') || label.includes('neg')) return 'sad';
    return 'neutral';
  }

  // If the model returns an object with 'scores' or other structure, try a best-effort
  if (data[0] && data[0].scores) {
    const best = data[0].scores.reduce((a,b)=> a.score>a.score ? a : b);
    const label = best.label.toLowerCase();
    if (label.includes('positive')) return 'happy';
    if (label.includes('negative')) return 'sad';
    return 'neutral';
  }

  // If unknown format, throw to allow fallback
  // Try to handle a few other common formats: plain string or { generated_text }
  try {
    if (typeof data === 'string') {
      const s = data.toLowerCase();
      if (s.includes('positive') || s.includes('good') || s.includes('happy') || s.includes('love')) return 'happy';
      if (s.includes('negative') || s.includes('bad') || s.includes('sad') || s.includes('hate')) return 'sad';
      return 'neutral';
    }
    if (data && data.generated_text) {
      const gen = String(data.generated_text).toLowerCase();
      if (gen.includes('positive') || gen.includes('good') || gen.includes('happy') || gen.includes('love')) return 'happy';
      if (gen.includes('negative') || gen.includes('bad') || gen.includes('sad') || gen.includes('hate')) return 'sad';
      return 'neutral';
    }
  } catch (e) {
    console.warn('Error while trying to parse non-standard HF response:', e && e.message ? e.message : e);
  }

  throw new Error('Unexpected HF response format');
}

router.post('/', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Missing content' });

  // Try HF first, fall back to local heuristic
  try {
    const sentiment = await hfAnalyze(content);
    return res.json({ sentiment, source: 'huggingface' });
  } catch (err) {
    // Log useful HF error details when available
    if (err.response) {
      console.warn('HF analyze failed, status:', err.response.status);
      try { console.warn('HF response body:', JSON.stringify(err.response.data)); } catch(e){ console.warn('HF response body (raw):', err.response.data); }
    } else {
      console.warn('HF analyze failed (no response):', err.message);
    }

    // If HF returned 403 (forbidden / permission issue), try a different well-known public model once
    const status = err.response && err.response.status;
    if (status === 403) {
      const altModel = process.env.HF_ALTERNATE_MODEL || 'distilbert-base-uncased-finetuned-sst-2-english';
      try {
        const sentimentAlt = await hfAnalyze(content, altModel);
        console.warn('HF alternate model succeeded:', altModel);
        return res.json({ sentiment: sentimentAlt, source: 'huggingface-alternate' });
      } catch (err2) {
        console.warn('HF alternate model also failed:', err2 && err2.message ? err2.message : err2);
        if (err2.response) {
          try { console.warn('Alt HF response body:', JSON.stringify(err2.response.data)); } catch(e){ console.warn('Alt HF response body (raw):', err2.response.data); }
        }
      }
    }
    const sentiment = localAnalyze(content);
    return res.json({ sentiment, source: 'local' });
  }
});

module.exports = router;
