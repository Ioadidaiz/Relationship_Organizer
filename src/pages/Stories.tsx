import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../App.css';

const Stories: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    initMap();

    return () => {
      // Cleanup map instance
      try {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initMap = () => {
    if (!mapContainerRef.current) return;

    // Create map using local maplibre-gl import
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [0, 20],
      zoom: 1.5,
    });

    map.on('style.load', () => {
      // try set globe projection when available
      try {
        map.setProjection({ type: 'globe' });
      } catch (e) {
        // some maplibre builds may not support globe; ignore gracefully
        console.warn('Globe projection not supported in this build:', e);
      }
    });

    // Home-Marker: Schwedter Straße 12, Berlin
    const homeLocation = { lng: 13.4050, lat: 52.5355 };

    const homeMarker = document.createElement('div');
    homeMarker.className = 'story-marker home-marker';
    homeMarker.title = 'Home - Schwedter Straße 12, Berlin';
    homeMarker.innerText = '🏠';
    homeMarker.style.fontSize = '24px';

    new maplibregl.Marker(homeMarker).setLngLat([homeLocation.lng, homeLocation.lat]).addTo(map);

    mapRef.current = map;
    setLoaded(true);
  };

  const goHome = () => {
    const map = mapRef.current;
    if (!map) return;

    // Schwedter Straße 12, 10119 Berlin
    const homeLocation = { lng: 13.4050, lat: 52.5355 };

    map.flyTo({ 
      center: [homeLocation.lng, homeLocation.lat], 
      zoom: 16,
      essential: true,
      duration: 2000 // 2 Sekunden Animation
    });
  };

  return (
    <div className="stories-page">
      <div className="stories-header">
        <h2>Stories — Unsere Reisen</h2>
        <p>Interaktive Karte (Globus) mit unseren bisherigen und geplanten Reisen. Maplibre-GL läuft jetzt lokal installiert.</p>
        <button className="btn" onClick={goHome} style={{marginTop: '8px'}}>
          🏠 Go Home
        </button>
      </div>
      <div ref={mapContainerRef} id="stories-map" style={{ width: '100%', height: '600px', borderRadius: 8, overflow: 'hidden', marginTop: '1rem' }}>
        {!loaded && <div className="map-loading">Karte wird geladen…</div>}
      </div>
    </div>
  );
};

export default Stories;
