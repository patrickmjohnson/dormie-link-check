// This is a Vercel Serverless Function that acts as our private proxy.

export default async function handler(request, response) {
  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // Fetch the target URL. We use more realistic browser headers to avoid getting blocked.
    const fetchResponse = await fetch(url, {
      redirect: 'follow', // Automatically follow redirects
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      },
    });

    // Send back the final status and the final URL after all redirects.
    return response.status(200).json({
      status: fetchResponse.status,
      finalUrl: fetchResponse.url,
    });
  } catch (error) {
    // If the fetch fails, send a success response but with an error payload.
    // This prevents the front-end from seeing a hard 500 error and allows for graceful handling.
    console.error(`Proxy error for ${url}:`, error.message);
    return response.status(200).json({
      status: 500, // Internal status code for our app to interpret
      error: `Proxy failed: ${error.message}`,
      finalUrl: url,
    });
  }
}
