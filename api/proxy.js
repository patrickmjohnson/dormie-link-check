// This is a Vercel Serverless Function that acts as our private proxy.
// This version includes retry logic to improve reliability.

async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            // Use AbortController for a manual timeout, as fetch doesn't have a built-in one.
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId); // Clear the timeout if the fetch was successful

            // If we get a server error (5xx), it's worth retrying.
            // Client errors (4xx) are usually permanent, so we don't retry them.
            if (response.status < 500) {
                return response;
            }
            // If it's a 5xx error, we'll let the loop continue to the next retry.
            console.log(`Attempt ${i + 1}: Received status ${response.status} for ${url}. Retrying...`);

        } catch (error) {
            clearTimeout(timeoutId);
            if (i === retries - 1) { // If this was the last retry, throw the error
                throw error;
            }
            console.log(`Attempt ${i + 1}: Fetch failed for ${url}. Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    // If all retries fail with 5xx errors, return the last failed response
    throw new Error(`All ${retries} attempts failed for ${url}.`);
}


export default async function handler(request, response) {
  const { url } = request.query;

  if (!url) {
    return response.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const fetchOptions = {
      redirect: 'follow',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'max-age=0',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
      },
    };

    const fetchResponse = await fetchWithRetry(url, fetchOptions);

    return response.status(200).json({
      status: fetchResponse.status,
      finalUrl: fetchResponse.url,
    });
  } catch (error) {
    console.error(`Proxy error for ${url}:`, error.message);
    return response.status(200).json({
      status: 500,
      error: `Proxy failed: ${error.message}`,
      finalUrl: url,
    });
  }
}
