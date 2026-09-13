import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { API_BASE } from '../../services/api';

export const VideoPlayer = ({ contentId, mimeType, title }) => {
  const streamUrl = `${API_BASE}/api/content/${contentId}/stream`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          backgroundColor: '#000',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          aspectRatio: '16/9',
          maxHeight: '650px',
        }}
      >
        <video
          controls
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        >
          <source src={streamUrl} type={mimeType || 'video/mp4'} />
          Your browser does not support HTML5 video streaming.
        </video>
      </div>

      <div className="security-alert">
        <ShieldAlert size={20} color="var(--accent-primary)" />
        <span>
          <strong>Protected Range Streaming Active:</strong> Video content is served in authenticated chunks directly from private storage. Direct file URLs are hidden.
        </span>
      </div>
    </div>
  );
};
