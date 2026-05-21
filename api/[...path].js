// Vercel serverless function — proxies all /api/* requests to Render backend
// maxDuration: 60s handles Render free-tier cold starts (~30s) + DeepSeek AI (~15s)

export const config = {
  maxDuration: 60,
};

const BACKEND = 'https://zhaojian.onrender.com';

export default async function handler(req, res) {
  const targetUrl = `${BACKEND}${req.url}`;

  try {
    const isBody = !['GET', 'HEAD'].includes(req.method);
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
        'x-forwarded-for': req.headers['x-forwarded-for'] || '',
      },
      body: isBody ? JSON.stringify(req.body) : undefined,
    });

    const text = await response.text();
    const ct = response.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    res.status(response.status).end(text);
  } catch (err) {
    res.status(502).json({
      error: '服务暂时不可用，请稍后再试',
      detail: err.message,
    });
  }
}
