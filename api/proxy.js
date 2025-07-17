// This is a Vercel Serverless Function that acts as our private proxy.

export default async function handler(request, response) {
  // Get the target URL from the query parameters.
  const { url } = request.query;

  // Validate that a URL was provided.
  if (!url) {
    return response.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    // Fetch the target URL. We use a 'user-agent' header to look like a real browser,
    // which helps avoid getting blocked by services like Amazon.
    const fetchResponse = await fetch(url, {
      redirect: 'follow', // Automatically follow redirects
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    // Send back the final status and the final URL after all redirects.
    response.status(200).json({
      status: fetchResponse.status,
      finalUrl: fetchResponse.url,
    });
  } catch (error) {
    // If the fetch fails (e.g., the domain doesn't exist), send back an error.
    console.error('Proxy fetch error:', error);
    response.status(500).json({ error: 'Failed to fetch the URL' });
  }
}
