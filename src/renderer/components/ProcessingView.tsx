import React, { useState, useEffect } from 'react';
import { ProcessingState } from './App';

interface ProcessingViewProps {
  processingState: ProcessingState;
  baseImage: string | null;
  targetImages: string[];
}

const ProcessingView: React.FC<ProcessingViewProps> = ({
  processingState,
  baseImage,
  targetImages
}) => {
  const { progress, status } = processingState;
  // Convert base image for display if unsupported
  const [baseDisplay, setBaseDisplay] = useState<string | null>(null);
  const isSafeForImg = (p?: string | null) => {
    if (!p) return false;
    const ext = p.split('.').pop()?.toLowerCase();
    return !!ext && ['jpg','jpeg','png','webp','gif'].includes(ext);
  };
  useEffect(() => {
    const run = async () => {
      if (baseImage && !isSafeForImg(baseImage)) {
        try {
          const res = await window.electronAPI.generatePreview({ path: baseImage });
          setBaseDisplay(res?.success ? res.previewPath : baseImage);
        } catch {
          setBaseDisplay(baseImage);
        }
      } else {
        setBaseDisplay(baseImage);
      }
    };
    run();
  }, [baseImage]);

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ 
          fontSize: '48px', 
          marginBottom: '20px',
          animation: 'pulse 2s infinite'
        }}>
          ✨
        </div>

        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          color: '#333',
          marginBottom: '12px'
        }}>
          Processing Your Images
        </h2>

        <p style={{ 
          fontSize: '16px', 
          color: '#666',
          marginBottom: '32px',
          lineHeight: '1.5'
        }}>
          AI is analyzing your reference image and generating color adjustments 
          for {targetImages.length} target image{targetImages.length !== 1 ? 's' : ''}
        </p>

        {/* Progress Bar */}
        <div style={{ 
          background: '#f5f6fa',
          borderRadius: '20px',
          height: '8px',
          overflow: 'hidden',
          marginBottom: '12px',
          maxWidth: '400px',
          margin: '0 auto 12px auto'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            height: '100%',
            borderRadius: '20px',
            width: `${progress}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>

        <div style={{ 
          fontSize: '16px', 
          fontWeight: '600',
          color: '#667eea',
          marginBottom: '8px'
        }}>
          {Math.round(progress)}%
        </div>

        <div style={{ 
          fontSize: '14px',
          color: '#666',
          fontWeight: '500',
          minHeight: '20px'
        }}>
          {status}
        </div>
      </div>

      {/* Image Preview Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '24px'
      }}>
        {/* Reference Card */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px',
            gap: '8px'
          }}>
            <div style={{ 
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#667eea'
            }} />
            <h3 style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#667eea',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Reference Style
            </h3>
          </div>
          
          {baseImage && (
            <div style={{
              width: '100%',
              height: '200px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #e8eaff',
              boxShadow: '0 2px 12px rgba(102, 126, 234, 0.1)'
            }}>
              <img 
                src={(() => {
                  const src = baseDisplay || baseImage;
                  return src?.startsWith('file://') ? src : `file://${src}`;
                })()}
                alt="Base image"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}

          <p style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '12px',
            margin: '12px 0 0 0'
          }}>
            {baseImage?.split('/').pop()}
          </p>
        </div>

        {/* Target Images Card */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px',
            gap: '8px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#764ba2',
              animation: 'pulse 2s infinite'
            }} />
            <h3 style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#764ba2',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Processing {targetImages.length} Image{targetImages.length !== 1 ? 's' : ''}
            </h3>
          </div>
          
          <div style={{
            width: '100%',
            height: '200px',
            borderRadius: '12px',
            border: '2px dashed #e0e0e0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
            color: '#999'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>
              Analyzing colors...
            </div>
          </div>

          <p style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '12px',
            margin: '12px 0 0 0'
          }}>
            {targetImages.length} file{targetImages.length !== 1 ? 's' : ''} queued
          </p>
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.7;
            }
          }
        `}
      </style>
    </div>
  );
};

export default ProcessingView;
