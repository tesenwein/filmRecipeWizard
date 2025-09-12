import React, { useState, useEffect } from 'react';

interface ProcessHistory {
  id: string;
  timestamp: string;
  baseImage: string;
  targetImages: string[];
  results: ProcessResult[];
  status: 'completed' | 'failed' | 'in_progress';
}

interface ProcessResult {
  inputPath: string;
  outputPath?: string;
  success: boolean;
  error?: string;
  metadata?: {
    aiAdjustments?: any;
    processingTime?: number;
  };
}

interface HistoryViewProps {
  onSelectProcess: (process: ProcessHistory) => void;
  onOpenProject: (process: ProcessHistory) => void;
  onNewProcess: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onSelectProcess, onOpenProject, onNewProcess }) => {
  const [history, setHistory] = useState<ProcessHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const result = await window.electronAPI.loadHistory();
      if (result.success && result.history) {
        setHistory(result.history);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProcess = async (processId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this process?')) {
      try {
        await window.electronAPI.deleteProcess(processId);
        await loadHistory(); // Reload history
      } catch (error) {
        console.error('Failed to delete process:', error);
      }
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '60px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚡</div>
        <h2>Loading History...</h2>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        border: 'none',
        marginBottom: '40px'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>📚</div>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '12px' }}>
          Processing History
        </h1>
        <p style={{ fontSize: '18px', opacity: 0.9, marginBottom: '30px' }}>
          View and manage your past image processing sessions
        </p>
        
        <button
          className="button"
          onClick={onNewProcess}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            backdropFilter: 'blur(10px)'
          }}
        >
          🚀 Start New Process
        </button>
      </div>

      {history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.5 }}>📥</div>
          <h3 style={{ fontSize: '24px', fontWeight: '600', color: '#666666', marginBottom: '16px' }}>
            No Processing History
          </h3>
          <p style={{ fontSize: '16px', color: '#999999', marginBottom: '30px' }}>
            Start your first image processing session to see it appear here
          </p>
          <button className="button" onClick={onNewProcess}>
            🎨 Create First Process
          </button>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
          {history.map((process, index) => (
            <div
              key={process.id}
              className="card slide-in"
              style={{ 
                animationDelay: `${index * 0.1}s`,
                position: 'relative',
                padding: '24px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
              }}
            >
              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: process.status === 'completed' ? '#4CAF50' : 
                           process.status === 'failed' ? '#f44336' : '#ff9800',
                color: 'white',
                borderRadius: '12px',
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {process.status === 'completed' ? '✓ Complete' : 
                 process.status === 'failed' ? '✗ Failed' : '⏳ In Progress'}
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => handleDeleteProcess(process.id, e)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#f44336',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.1)';
                }}
              >
                🗑️
              </button>

              {/* Process Details */}
              <div style={{ marginTop: '40px' }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#333333',
                  marginBottom: '12px'
                }}>
                  {formatDate(process.timestamp)}
                </h3>

                <div style={{ 
                  fontSize: '14px', 
                  color: '#666666',
                  marginBottom: '16px'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Base Image:</strong> {process.baseImage.split('/').pop()}
                  </div>
                  <div>
                    <strong>Target Images:</strong> {process.targetImages.length} file{process.targetImages.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Results Summary */}
                {process.results.length > 0 && (
                  <div style={{
                    background: '#f8f9ff',
                    border: '1px solid #e8eaff',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '13px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4CAF50' }}>
                        ✓ {process.results.filter(r => r.success).length} successful
                      </span>
                      {process.results.filter(r => !r.success).length > 0 && (
                        <span style={{ color: '#f44336' }}>
                          ✗ {process.results.filter(r => !r.success).length} failed
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  marginTop: '16px',
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: '16px'
                }}>
                  <button
                    className="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenProject(process);
                    }}
                    style={{
                      flex: 1,
                      fontSize: '14px',
                      padding: '12px 16px',
                      minHeight: 'auto'
                    }}
                  >
                    🎨 Open Project
                  </button>
                  
                  {process.results.length > 0 && (
                    <button
                      className="button-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProcess(process);
                      }}
                      style={{
                        flex: 1,
                        fontSize: '14px',
                        padding: '12px 16px',
                        minHeight: 'auto'
                      }}
                    >
                      👁️ View Results
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryView;