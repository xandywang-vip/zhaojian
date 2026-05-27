// Cloudflare Pages Function — proxies /api/* to Render backend
const BACKEND = 'https://zhaojian.onrender.com';

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = `${BACKEND}${url.pathname}${url.search}`;

  try {
    const isBody = !['GET', 'HEAD'].includes(request.method);
    // 透传关键 header（x-device-id 用于设备隔离，缺失会导致心境墙/历史记录为空）
    const headers = {
      'content-type':   request.headers.get('content-type') || 'application/json',
      'x-forwarded-for': request.headers.get('cf-connecting-ip') || '',
    };
    const deviceId = request.headers.get('x-device-id');
    if (deviceId) headers['x-device-id'] = deviceId;

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
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
