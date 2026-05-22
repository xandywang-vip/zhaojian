// Cloudflare Pages Function — proxies /api/* to Render backend
const BACKEND = 'https://zhaojian.onrender.com';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = `${BACKEND}${url.pathname}${url.search}`;

  try {
    const isBody = !['GET', 'HEAD'].includes(request.method);
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        'content-type': request.headers.get('content-type') || 'application/json',
        'x-forwarded-for': request.headers.get('cf-connecting-ip') || '',
      },
      body: isBody ? request.body : null,
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: '服务暂时不可用，请稍后再试', detail: err.message }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }
}
