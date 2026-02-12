import { useEffect, useRef, useState } from 'react';

export default function ImageGalleryModal({ design, onSelect, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [pointerState, setPointerState] = useState({
    pointers: new Map(),
    initialDistance: null,
    initialZoom: 1
  });
  const mainImageRef = useRef(null);
  const thumbnailStripRef = useRef(null);
  const modalContentRef = useRef(null);

  if (!design) return null;

  const images = design.images || (design.imageUrl ? [design.imageUrl] : []);
  const currentImage = images[selectedIndex];

  useEffect(() => {
    setZoom(1);
    setOrigin({ x: 50, y: 50 });
  }, [selectedIndex, design?.id]);

  useEffect(() => {
    const nextIndex = images.length > 1 ? 1 : 0;
    setSelectedIndex(nextIndex);
    requestAnimationFrame(() => {
      if (thumbnailStripRef.current) {
        thumbnailStripRef.current.scrollLeft = 0;
      }
      if (modalContentRef.current && mainImageRef.current) {
        const targetTop = Math.max(0, mainImageRef.current.offsetTop - 12);
        modalContentRef.current.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
    });
  }, [design?.id, images.length]);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.95)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}
        ref={modalContentRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '0.9rem 1.2rem',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#111827' }}>
              {design.name}
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
              {images.length} {images.length === 1 ? 'image' : 'images'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '2rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem',
              lineHeight: 1,
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = '#111827'}
            onMouseLeave={(e) => e.target.style.color = '#6b7280'}
          >
            ×
          </button>
        </div>

        {/* Main Image Display */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.5rem',
          background: '#f9fafb',
          position: 'relative',
          minHeight: '70vh'
        }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: '12px',
              touchAction: 'none'
            }}
            onClick={() => {
              setZoom((prev) => (prev > 1 ? 1 : 2));
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              setOrigin({ x, y });
            }}
            onMouseLeave={() => setOrigin({ x: 50, y: 50 })}
            onWheel={(e) => {
              setZoom((prev) => {
                const next = prev + (e.deltaY < 0 ? 0.2 : -0.2);
                return Math.min(3, Math.max(1, parseFloat(next.toFixed(2))));
              });
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setPointerState((prev) => {
                const next = new Map(prev.pointers);
                next.set(e.pointerId, { x: e.clientX, y: e.clientY });
                let initialDistance = prev.initialDistance;
                let initialZoom = prev.initialZoom;
                if (next.size === 2) {
                  const points = Array.from(next.values());
                  const dx = points[0].x - points[1].x;
                  const dy = points[0].y - points[1].y;
                  initialDistance = Math.hypot(dx, dy);
                  initialZoom = zoom;
                }
                return { pointers: next, initialDistance, initialZoom };
              });
            }}
            onPointerMove={(e) => {
              setPointerState((prev) => {
                if (!prev.pointers.has(e.pointerId)) return prev;
                const next = new Map(prev.pointers);
                next.set(e.pointerId, { x: e.clientX, y: e.clientY });
                if (next.size === 2 && prev.initialDistance) {
                  const points = Array.from(next.values());
                  const dx = points[0].x - points[1].x;
                  const dy = points[0].y - points[1].y;
                  const distance = Math.hypot(dx, dy);
                  const scale = distance / prev.initialDistance;
                  const newZoom = Math.min(3, Math.max(1, parseFloat((prev.initialZoom * scale).toFixed(2))));
                  setZoom(newZoom);
                }
                return { ...prev, pointers: next };
              });
            }}
            onPointerUp={(e) => {
              setPointerState((prev) => {
                const next = new Map(prev.pointers);
                next.delete(e.pointerId);
                return {
                  pointers: next,
                  initialDistance: next.size === 2 ? prev.initialDistance : null,
                  initialZoom: next.size === 2 ? prev.initialZoom : zoom
                };
              });
            }}
          >
            <img 
              ref={mainImageRef}
              src={currentImage}
              alt={`${design.name} - Image ${selectedIndex + 1}`}
              style={{
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
                transform: `scale(${zoom})`,
                transformOrigin: `${origin.x}% ${origin.y}%`,
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 18px 40px rgba(220, 0, 0, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.18)';
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelect) onSelect(design);
                if (onClose) onClose();
              }}
            />
          </div>

          <div style={{
            position: 'absolute',
            bottom: '1.5rem',
            right: '1.5rem',
            display: 'flex',
            gap: '0.5rem',
            background: 'rgba(15, 23, 42, 0.75)',
            padding: '0.5rem',
            borderRadius: '999px',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            backdropFilter: 'blur(8px)'
          }}>
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3, parseFloat((prev + 0.2).toFixed(2))))}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.9)',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '700'
              }}
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(1, parseFloat((prev - 0.2).toFixed(2))))}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.9)',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '700'
              }}
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              style={{
                padding: '0 0.75rem',
                height: '36px',
                borderRadius: '18px',
                border: 'none',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '700',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}
            >
              Reset
            </button>
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              {selectedIndex > 0 && (
                <button
                  onClick={() => setSelectedIndex(selectedIndex - 1)}
                  style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    color: '#111827',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#dc0000';
                    e.target.style.borderColor = '#dc0000';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.color = '#111827';
                  }}
                >
                  ←
                </button>
              )}
              {selectedIndex < images.length - 1 && (
                <button
                  onClick={() => setSelectedIndex(selectedIndex + 1)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.5rem',
                    color: '#111827',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#dc0000';
                    e.target.style.borderColor = '#dc0000';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'white';
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.color = '#111827';
                  }}
                >
                  →
                </button>
              )}
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div style={{
            padding: '1rem',
            borderTop: '2px solid #e5e7eb',
            background: 'white'
          }}>
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              overflowX: 'auto',
              padding: '0.5rem 0'
            }} ref={thumbnailStripRef}>
              {images.map((img, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedIndex(index)}
                  style={{
                    width: '80px',
                    height: '80px',
                    flexShrink: 0,
                    cursor: 'pointer',
                    border: selectedIndex === index ? '3px solid #dc0000' : '2px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    opacity: selectedIndex === index ? 1 : 0.6
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 8px 18px rgba(220, 0, 0, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <img 
                    src={img}
                    alt={`Thumbnail ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{
          padding: '1.5rem',
          borderTop: '2px solid #e5e7eb',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end',
          background: '#f9fafb'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '1rem',
              cursor: 'pointer',
              color: '#374151',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#9ca3af';
              e.target.style.background = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.background = 'white';
            }}
          >
            Cancel
          </button>
          {onSelect && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onSelect) onSelect(design);
                if (onClose) onClose();
              }}
              style={{
                padding: '0.75rem 2rem',
                background: 'linear-gradient(135deg, #000000 0%, #dc0000 100%)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '1rem',
                cursor: 'pointer',
                color: 'white',
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(220, 0, 0, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(220, 0, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(220, 0, 0, 0.3)';
              }}
            >
              Select This Design
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
