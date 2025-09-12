import React, { useEffect, useState } from 'react';
import { ProcessingResult } from './App';
import XMPExportModal from './XMPExportModal';

interface ResultsViewProps {
  results: ProcessingResult[];
  baseImage: string | null;
  targetImages: string[];
  onReset: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({
  results,
  baseImage: _baseImage,
  targetImages,
  onReset
}) => {
  const [selectedResult, setSelectedResult] = useState<ProcessingResult | null>(null);
  const [showXMPModal, setShowXMPModal] = useState(false);
  const [resultPreviews, setResultPreviews] = useState<string[]>([]);

  const successfulResults = results.filter(result => result.success);
  const failedResults = results.filter(result => !result.success);

  const handleExportXMP = (result: ProcessingResult) => {
    setSelectedResult(result);
    setShowXMPModal(true);
  };

  const handleCloseXMPModal = () => {
    setShowXMPModal(false);
    setSelectedResult(null);
  };

  // Generate previews for results with AI adjustments applied (fallback to basic preview)
  useEffect(() => {
    const basicPreview = async (imagePath: string): Promise<string> => {
      try {
        const result = await window.electronAPI.generatePreview({ path: imagePath });
        return result.success ? result.previewPath : imagePath;
      } catch (error) {
        console.error('Error generating preview for result:', error);
        return imagePath;
      }
    };

    const adjustedPreview = async (imagePath: string, adjustments: any): Promise<string> => {
      try {
        const result = await window.electronAPI.generateAdjustedPreview({ path: imagePath, adjustments });
        return result.success ? result.previewPath : imagePath;
      } catch (error) {
        console.error('Error generating adjusted preview for result:', error);
        return imagePath;
      }
    };

    const run = async () => {
      const paths = await Promise.all(
        results.map((r, idx) => {
          const src = r.outputPath || targetImages[idx];
          const adj = r.metadata?.aiAdjustments;
          return adj ? adjustedPreview(src, adj) : basicPreview(src);
        })
      );
      setResultPreviews(paths);
    };

    if (results && results.length) {
      run();
    } else {
      setResultPreviews([]);
    }
  }, [results, targetImages]);

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        border: 'none'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>
          ✨
        </div>
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '700', 
          marginBottom: '8px'
        }}>
          Processing Complete!
        </h2>
        <p style={{ 
          fontSize: '16px', 
          opacity: 0.9,
          marginBottom: '24px'
        }}>
          {successfulResults.length} of {results.length} images processed successfully
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="button"
            onClick={onReset}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              backdropFilter: 'blur(10px)'
            }}
          >
            🔄 Process New Images
          </button>
        </div>
      </div>

      {/* Successful Results */}
      {successfulResults.length > 0 && (
        <div>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#333333',
            marginBottom: '20px'
          }}>
            Successfully Processed Images
          </h3>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
            {successfulResults.map((result, index) => (
              <div key={index} className="card slide-in" style={{ animationDelay: `${index * 0.1}s` }}>
                {/* Image Preview */}
                <div style={{
                  width: '100%',
                  height: '280px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  marginBottom: '20px',
                  border: '3px solid #f0f0f0',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  position: 'relative'
                }}>
                  <img
                    src={(() => {
                      const preview = resultPreviews[index];
                      const fallback = result.outputPath || targetImages[index];
                      const src = preview || fallback;
                      return src?.startsWith('file://') ? src : `file://${src}`;
                    })()}
                    alt={`Processed image ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(102, 126, 234, 0.9)',
                    color: 'white',
                    borderRadius: '16px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }}>
                    ✨ AI Processed
                  </div>
                </div>

                {/* Filename */}
                <h4 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: '#333333',
                  marginBottom: '8px',
                  wordBreak: 'break-word'
                }}>
                  {result.outputPath?.split('/').pop() || `Image ${index + 1}`}
                </h4>

                {/* AI Analysis Info */}
                {result.metadata?.aiAdjustments && (
                  <div style={{ 
                    background: '#f8f9ff', 
                    border: '1px solid #e8eaff',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontSize: '16px' }}>🤖</span>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#667eea'
                      }}>
                        AI Analysis
                      </span>
                      <span style={{
                        background: '#667eea',
                        color: 'white',
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        fontWeight: '600'
                      }}>
                        {Math.round((result.metadata.aiAdjustments.confidence || 0) * 100)}%
                      </span>
                    </div>
                    
                    {/* Key Adjustments Preview */}
                    <div style={{ fontSize: '12px', color: '#555555', lineHeight: '1.4' }}>
                      <div>
                        <strong>Temp:</strong> {Math.round(result.metadata.aiAdjustments.temperature || 0)}K, {' '}
                        <strong>Exp:</strong> {(result.metadata.aiAdjustments.exposure || 0).toFixed(2)}
                      </div>
                      {result.metadata.aiAdjustments.reasoning && (
                        <div style={{ 
                          fontStyle: 'italic', 
                          marginTop: '6px',
                          color: '#666666'
                        }}>
                          "{result.metadata.aiAdjustments.reasoning.substring(0, 100)}..."
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className="button"
                    onClick={() => handleExportXMP(result)}
                    style={{ flex: '1', minWidth: '120px' }}
                  >
                    📋 Export XMP
                  </button>
                  
                  <button
                    className="button-secondary"
                    onClick={() => window.electronAPI.openPath(result.outputPath!)}
                    style={{ flex: '1', minWidth: '120px' }}
                  >
                    📂 Show File
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Failed Results */}
      {failedResults.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#d73027',
            marginBottom: '20px'
          }}>
            Failed Processing ({failedResults.length} image{failedResults.length !== 1 ? 's' : ''})
          </h3>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {failedResults.map((result, index) => (
              <div key={index} className="card" style={{ 
                border: '2px solid #ffebee',
                background: '#fafafa'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '24px' }}>❌</span>
                  <div>
                    <h4 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#d73027',
                      marginBottom: '4px'
                    }}>
                      Processing Failed
                    </h4>
                    <p style={{ 
                      fontSize: '12px', 
                      color: '#666666'
                    }}>
                      Image {index + 1}
                    </p>
                  </div>
                </div>
                
                <p style={{ 
                  fontSize: '14px', 
                  color: '#666666',
                  background: '#ffffff',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0'
                }}>
                  {result.error || 'Unknown error occurred'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XMP Export Modal */}
      {showXMPModal && selectedResult && (
        <XMPExportModal
          result={selectedResult}
          onClose={handleCloseXMPModal}
        />
      )}
    </div>
  );
};

export default ResultsView;
