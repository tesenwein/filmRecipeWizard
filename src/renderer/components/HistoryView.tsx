import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Grid,
  IconButton,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { ProcessHistory } from '../../shared/types';

interface HistoryViewProps {
  onOpenProject: (process: ProcessHistory) => void;
  onNewProcess: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onOpenProject, onNewProcess }) => {
  const [history, setHistory] = useState<ProcessHistory[]>([]);
  const [basePreviews, setBasePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const result = await window.electronAPI.loadHistory();
      if (result.success) {
        const items = (result.history as any[]) || [];
        setHistory(items);
        const previews = await Promise.all(
          items.map(async (p: any) => {
            try {
              const res = await window.electronAPI.generatePreview({ path: p.baseImage });
              return res?.previewPath || p.baseImage;
            } catch {
              return p.baseImage;
            }
          })
        );
        setBasePreviews(previews);
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
      <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Grid item>
          <Typography variant="h5" fontWeight={700}>
            Your Projects
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Past color matching sessions
          </Typography>
        </Grid>
        <Grid item>
          <Button variant="contained" onClick={onNewProcess}>
            New Project
          </Button>
        </Grid>
      </Grid>

      {history.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ opacity: 0.5, mb: 2 }}>
            📥
          </Typography>
          <Typography variant="h6" sx={{ mb: 1 }}>
            No projects yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first color project to get started
          </Typography>
          <Button variant="contained" onClick={onNewProcess}>
            Create First Project
          </Button>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {history.map((process, index) => (
            <Grid item xs={12} sm={6} md={4} key={process.id}>
              <Card elevation={2} sx={{ position: 'relative', overflow: 'hidden' }}>
                <IconButton
                  aria-label="Delete"
                  size="small"
                  onClick={e => handleDeleteProcess(process.id, e)}
                  title="Delete"
                  sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'rgba(17,24,39,0.04)', zIndex: 2, '&:hover': { bgcolor: 'rgba(17,24,39,0.08)' } }}
                >
                  <DeleteOutlineIcon fontSize="small" sx={{ color: 'action.active' }} />
                </IconButton>
                <CardActionArea
                  onClick={() => {
                    console.log('[HISTORY] Open clicked', {
                      id: process.id,
                      timestamp: process.timestamp,
                      baseImage: process.baseImage,
                      targetCount: process.targetImages?.length,
                      resultsCount: Array.isArray((process as any).results)
                        ? (process as any).results.length
                        : 0,
                    });
                    onOpenProject(process);
                  }}
                >
                  {basePreviews[index] && (
                    <CardMedia
                      component="img"
                      height="240"
                      image={
                        basePreviews[index].startsWith('file://')
                          ? basePreviews[index]
                          : `file://${basePreviews[index]}`
                      }
                      alt={`Base preview ${index + 1}`}
                    />
                  )}
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} noWrap>
                      {(() => {
                        const aiName = (process as any)?.results?.[0]?.metadata?.aiAdjustments?.preset_name as string | undefined;
                        const name = process.name || (typeof aiName === 'string' && aiName.trim().length > 0 ? aiName : undefined);
                        return name || process.baseImage.split('/').pop();
                      })()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(process.timestamp)}
                    </Typography>
                  </CardContent>
                </CardActionArea>
                <CardContent sx={{ pt: 0 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={e => {
                      e.stopPropagation();
                      console.log('[HISTORY] Open button', {
                        id: process.id,
                        timestamp: process.timestamp,
                        baseImage: process.baseImage,
                        targetCount: process.targetImages?.length,
                        resultsCount: Array.isArray((process as any).results)
                          ? (process as any).results.length
                          : 0,
                      });
                      onOpenProject(process);
                    }}
                  >
                    Open Project
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </div>
  );
};

export default HistoryView;
