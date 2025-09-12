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
  const [baseImagePreview, setBaseImagePreview] = useState<string | null>(null);

  const generatePreview = async (imagePath: string): Promise<string> => {
    try {
      const result = await window.electronAPI.generatePreview({ path: imagePath });
      return result.success ? result.previewPath : imagePath;
    } catch (error) {
      console.error('Error generating preview:', error);
      return imagePath;
    }
  };

  useEffect(() => {
    if (baseImage) {
      generatePreview(baseImage).then(setBaseImagePreview);
    }
  }, [baseImage]);

  return (
    <div className="card" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ 
        fontSize: '64px', 
        marginBottom: '24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'pulse 2s infinite'
      }}>
        🤖
      </div>

      <h2 style={{ 
        fontSize: '28px', 
        fontWeight: '700', 
        color: '#333333',
        marginBottom: '12px'
      }}>
        AI Processing in Progress
      </h2>

      <p style={{ 
        fontSize: '16px', 
        color: '#666666',
        marginBottom: '32px',
        lineHeight: '1.6'
      }}>
        Our AI is analyzing your reference image and generating precise color adjustments 
        for {targetImages.length} target image{targetImages.length !== 1 ? 's' : ''}
      </p>

      {/* Progress Bar */}
      <div className="progress-bar" style={{ marginBottom: '16px' }}>
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>

      <div style={{ 
        fontSize: '14px', 
        fontWeight: '600',
        color: '#667eea',
        marginBottom: '8px'
      }}>
        {Math.round(progress)}%
      </div>

      <div className="status-message" style={{ 
        fontSize: '15px',
        color: '#555555',
        fontWeight: '500',
        minHeight: '20px'
      }}>
        {status}
      </div>

      {/* Image Preview */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '16px', 
        marginTop: '40px',
        maxWidth: '400px',
        margin: '40px auto 0'
      }}>
        <div>
          <h4 style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#999999', 
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Reference Style
          </h4>
          {baseImage && (
            <div style={{
              width: '100%',
              height: '120px',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '2px solid #667eea',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)'
            }}>
              <img 
                src={baseImagePreview ? (baseImagePreview.startsWith('file://') ? baseImagePreview : `file://${baseImagePreview}`) : `file://${baseImage}`}
                alt="Base image"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
          )}
        </div>

        <div>
          <h4 style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#999999', 
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Processing {targetImages.length} Image{targetImages.length !== 1 ? 's' : ''}
          </h4>
          <div style={{
            width: '100%',
            height: '100px',
            borderRadius: '8px',
            border: '2px dashed #d0d0d0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa',
            color: '#999999',
            fontSize: '24px'
          }}>
            ⚡
          </div>
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