export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  
  // CORS support
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const path = url.searchParams.get('path');
  if (!path) {
    return new Response(JSON.stringify({ error: 'Missing path parameter' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const TMDB_API_KEY = '607bf14c16a8ab16f9ed61e6ba5920a7';
  const searchParams = new URLSearchParams();
  
  // Forward all query parameters except 'path'
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== 'path') {
      searchParams.set(key, value);
    }
  }
  searchParams.set('api_key', TMDB_API_KEY);

  const tmdbUrl = `https://api.themoviedb.org/3/${path}?${searchParams.toString()}`;

  try {
    const apiRes = await fetch(tmdbUrl);
    if (!apiRes.ok) {
      return new Response(JSON.stringify({ error: `TMDB responded with status ${apiRes.status}` }), {
        status: apiRes.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    const data = await apiRes.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Cache the response at the edge for 1 hour, stale-while-revalidate for 10 minutes
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
