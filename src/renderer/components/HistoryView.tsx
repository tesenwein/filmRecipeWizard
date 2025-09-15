import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Button,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { ProcessHistory } from '../../shared/types';
import SingleImage from './SingleImage';

interface HistoryViewProps {
  onOpenRecipe: (process: ProcessHistory) => void;
  onNewProcess: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ onOpenRecipe, onNewProcess }) => {
  const [history, setHistory] = useState<ProcessHistory[]>([]);
  const [basePreviews, setBasePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const result = await window.electronAPI.loadHistory();
      if (result.success) {
        const items = (result.history as any[]) || [];
        setHistory(items);
        const previews = items.map((p: any) =>
          p?.recipeImageData && typeof p.recipeImageData === 'string' && p.recipeImageData.length > 0
            ? `data:image/jpeg;base64,${p.recipeImageData}`
            : ''
        );
        setBasePreviews(previews);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, processId: string) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedProcessId(processId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProcessId(null);
  };

  const handleDeleteProcess = async () => {
    if (!selectedProcessId) return;
    handleMenuClose();
    if (confirm('Are you sure you want to delete this process?')) {
      try {
        await window.electronAPI.deleteProcess(selectedProcessId);
        await loadHistory(); // Reload history
      } catch (error) {
        console.error('Failed to delete process:', error);
      }
    }
  };

  const handleExportProcess = async () => {
    if (!selectedProcessId) return;
    handleMenuClose();
    const res = await window.electronAPI.exportRecipe(selectedProcessId);
    if (!res.success && res.error && res.error !== 'Export canceled') {
      alert(`Export failed: ${res.error}`);
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
        <Grid>
          <Typography variant="h5" fontWeight={700}>
            Your Recipes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Past color matching sessions
          </Typography>
        </Grid>
        <Grid style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="outlined"
            onClick={async () => {
              const res = await window.electronAPI.importRecipe();
              if (res.success) {
                await loadHistory();
              } else if (res.error && res.error !== 'Import canceled') {
                alert(`Import failed: ${res.error}`);
              }
            }}
          >
            Import Zip
          </Button>
          <Button variant="contained" onClick={onNewProcess}>
            New Recipe
          </Button>
        </Grid>
      </Grid>

      {history.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ opacity: 0.5, mb: 2 }}>
            📥
          </Typography>
          <Typography variant="h6" sx={{ mb: 1 }}>
            No recipes yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first color recipe to get started
          </Typography>
          <Button variant="contained" onClick={onNewProcess}>
            Create First Recipe
          </Button>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {history.map((process, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={process.id}>
              <Card elevation={2} sx={{ position: 'relative', overflow: 'hidden' }}>
                {/* Menu button (top-right) */}
                <IconButton
                  aria-label="Options"
                  size="small"
                  onClick={e => handleMenuOpen(e, process.id)}
                  title="Options"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: 'none',
                    boxShadow: 'none',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.08)',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                    },
                  }}
                >
                  <MoreVertIcon fontSize="small" sx={{ color: '#666' }} />
                </IconButton>
                <CardActionArea
                  onClick={() => {
                    console.log('[HISTORY] Open clicked', {
                      id: process.id,
                      timestamp: process.timestamp,
                      resultsCount: Array.isArray((process as any).results)
                        ? (process as any).results.length
                        : 0,
                    });
                    onOpenRecipe(process);
                  }}
                >
                  <div style={{ height: 240, borderRadius: 2, overflow: 'hidden' }}>
                    <SingleImage
                      source={basePreviews[index] || undefined}
                      alt={`Recipe ${index + 1}`}
                      fit="contain"
                    />
                  </div>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} noWrap>
                      {(() => {
                        const aiName = (process as any)?.results?.[0]?.metadata?.aiAdjustments
                          ?.preset_name as string | undefined;
                        const name =
                          process.name ||
                          (typeof aiName === 'string' && aiName.trim().length > 0
                            ? aiName
                            : undefined);
                        if (name && name.trim().length > 0) return name;
                        // Fallback: human-friendly timestamp label
                        try {
                          return new Date(process.timestamp).toLocaleString();
                        } catch {
                          return `Recipe ${process.id}`;
                        }
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
                        resultsCount: Array.isArray((process as any).results)
                          ? (process as any).results.length
                          : 0,
                      });
                      onOpenRecipe(process);
                    }}
                  >
                    Open
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleExportProcess}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export Zip</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteProcess} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </div>
  );
};

export default HistoryView;
