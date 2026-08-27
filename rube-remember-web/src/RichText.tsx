import React from 'react';

interface RichTextProps {
  text?: string;
  images?: string[];
  className?: string;
  style?: React.CSSProperties;
  onImageClick?: (src: string) => void;
}

export function RichText({ text, images, className, style, onImageClick }: RichTextProps) {
  const hasText = typeof text === 'string' && text.trim().length > 0;
  const hasImages = images && images.length > 0;

  if (!hasText && !hasImages) return null;

  // Regex to detect urls
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const tokens = hasText ? text!.split(urlRegex) : [];

  return (
    <span className={className} style={{ display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...style }}>
      {tokens.map((token, index) => {
        if (!token) return null;
        const isUrl = urlRegex.test(token);
        urlRegex.lastIndex = 0; // Reset regex state
        if (isUrl) {
          let targetUrl = token.trim();
          while (targetUrl && /[.,;:!]$/.test(targetUrl)) {
            targetUrl = targetUrl.slice(0, -1);
          }
          if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
          }
          
          const cleanUrl = targetUrl.split('?')[0].split('#')[0];
          const isImg = /\.(jpg|jpeg|png|gif|webp|bmp)/i.test(cleanUrl) || targetUrl.startsWith('data:image/');

          if (isImg) {
            return (
              <span key={index} style={{ display: 'block', margin: '8px 0', maxWidth: '100%' }}>
                <img
                  src={targetUrl}
                  alt="Embedded content"
                  onClick={() => onImageClick?.(targetUrl)}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '1px solid rgba(255,255,255,0.1)',
                    cursor: onImageClick ? 'pointer' : 'default'
                  }}
                />
              </span>
            );
          } else {
            return (
              <a
                key={index}
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--color-sol, #ff9500)',
                  textDecoration: 'underline',
                  fontWeight: 600,
                  wordBreak: 'break-all'
                }}
              >
                {token}
              </a>
            );
          }
        }
        return <span key={index}>{token}</span>;
      })}

      {hasImages && (
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', marginBottom: '8px' }}>
          {images!.map((img, idx) => (
            <span key={`indep-img-${idx}`} style={{ display: 'block', maxWidth: '100%' }}>
              <img
                src={img}
                alt="Attached content"
                onClick={() => onImageClick?.(img)}
                style={{
                  maxWidth: '100%',
                  maxHeight: '300px',
                  borderRadius: '8px',
                  objectFit: 'cover',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: onImageClick ? 'pointer' : 'default'
                }}
              />
            </span>
          ))}
        </span>
      )}
    </span>
  );
}
