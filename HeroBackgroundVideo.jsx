import React, { useState, useEffect } from 'react';

/**
 * HeroBackgroundVideo - A React/Tailwind component that fetches a movie or TV trailer 
 * from the TMDB API and uses it as a silent, looping, autoplaying background video 
 * for a hero section.
 *
 * @param {Object} props
 * @param {string|number} props.tmdbId - The TMDb Movie or TV Show ID.
 * @param {string} [props.mediaType='movie'] - Either 'movie' or 'tv'.
 * @param {string} [props.apiKey] - Your TMDb API key. If not provided, it will check environment variables.
 * @param {React.ReactNode} [props.children] - Children elements to overlay on top of the hero section.
 */
export default function HeroBackgroundVideo({ 
  tmdbId, 
  mediaType = 'movie', 
  apiKey = process.env.REACT_APP_TMDB_API_KEY || import.meta.env?.VITE_TMDB_API_KEY || '607bf14c16a8ab16f9ed61e6ba5920a7',
  children 
}) {
  const [videoKey, setVideoKey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tmdbId) return;

    let isMounted = true;
    setLoading(true);

    const fetchTrailer = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${tmdbId}/videos?api_key=${apiKey}`
        );
        if (!response.ok) {
          throw new Error(`TMDb API responded with status ${response.status}`);
        }
        const data = await response.json();
        const results = data.results || [];

        // Filter strictly for site: "YouTube" and type: "Trailer"
        const trailer = results.find(v => v.site === 'YouTube' && v.type === 'Trailer');

        if (isMounted) {
          if (trailer && trailer.key) {
            setVideoKey(trailer.key);
          } else {
            setVideoKey(null);
          }
        }
      } catch (error) {
        console.error('Error fetching trailer from TMDb:', error);
        if (isMounted) setVideoKey(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTrailer();

    return () => {
      isMounted = false;
    };
  }, [tmdbId, mediaType, apiKey]);

  // Fallback: If no trailer exists or is loading, render a clean, solid black background
  if (loading || !videoKey) {
    return (
      <div className="relative w-full h-full bg-black overflow-hidden flex items-end">
        {/* Render children overlays even in fallback state */}
        <div className="relative z-20 w-full h-full">
          {children}
        </div>
      </div>
    );
  }

  // Strict background parameters:
  // autoplay=1, mute=1, loop=1, controls=0, modestbranding=1, showinfo=0, disablekb=1, playsinline=1
  // Crucial: To make a YouTube video loop, you must also pass the video ID to the playlist parameter.
  const embedParams = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    loop: '1',
    playlist: videoKey,
    controls: '0',
    modestbranding: '1',
    showinfo: '0',
    disablekb: '1',
    playsinline: '1'
  }).toString();

  const embedUrl = `https://www.youtube.com/embed/${videoKey}?${embedParams}`;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      
      {/* The Background Hack (No Black Bars) */}
      <div className="relative overflow-hidden w-full h-full pointer-events-none z-0">
        <iframe
          src={embedUrl}
          title="Movie Trailer Background"
          className="absolute top-1/2 left-1/2 w-[150vw] h-[150vh] -translate-x-1/2 -translate-y-1/2 border-0 pointer-events-none"
          allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>

      {/* The Monochromatic Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10 pointer-events-none" />

      {/* Children content (Title, description, action buttons overlaying the trailer) */}
      <div className="absolute inset-0 z-20 w-full h-full flex items-end">
        {children}
      </div>

    </div>
  );
}
