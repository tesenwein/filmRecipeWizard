import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { Box, Button, Chip, IconButton, Paper, Tooltip } from '@mui/material';
import React, { useCallback, useMemo, useState } from 'react';
import ImageGrid from './ImageGrid';
import SingleImage from './SingleImage';

type Kind = 'target' | 'reference';

interface ImagePickerProps {
  kind: Kind;
  title?: string;
  description?: string;
  images: string[];
  previews: string[];
  maxFiles?: number;
  onSelectFiles: () => void;
  onRemoveImage?: (index: number) => void;
  onDropFiles?: (paths: string[]) => void;
  required?: boolean;
}

// Supported web-safe image formats only
const allowedExt = ['jpg', 'jpeg', 'png', 'webp'];

function isValidImagePath(path?: string) {
  if (!path) return false;
  const ext = path.split('.').pop()?.toLowerCase();
  return !!ext && allowedExt.includes(ext);
}

const ImagePicker: React.FC<ImagePickerProps> = ({
  kind,
  title,
  description,
  images,
  previews,
  maxFiles = 3,
  onSelectFiles,
  onRemoveImage,
  onDropFiles,
  required = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const defaults = useMemo(() => {
    if (kind === 'target') {
      return {
        title: 'Target Image',
        description: 'The photo you want to transform',
        chip: undefined,
        icon: <PhotoCameraOutlinedIcon sx={{ color: 'primary.main', fontSize: 24 }} />,
        emptyCta: 'Select Target Images',
        changeCta: 'Change Images',
        countLabel: (n: number) => `${n} image${n !== 1 ? 's' : ''} selected`,
      };
    }
    return {
      title: 'Reference Style',
      description: 'Upload up to 3 reference images',
      chip: undefined,
      icon: <PaletteOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />,
      emptyCta: 'Select Reference Images',
      changeCta: 'Change Images',
      countLabel: (n: number) => `${n} reference${n !== 1 ? 's' : ''}`,
    };
  }, [kind]);

  const headerTitle = title || defaults.title;
  const headerDescription = description || defaults.description;

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    } catch {
      // Ignore dataTransfer errors in some browsers
    }
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (!onDropFiles) return;

      const files = Array.from(e.dataTransfer.files || []);
      if (files.length === 0) return;

      // Filter valid image files
      const validFiles = files.filter(f => isValidImagePath(f.name));
      if (validFiles.length === 0) return;

      try {
        // Read files as base64
        const fileData = await Promise.all(
          validFiles.map(async file => {
            return new Promise<{ name: string; data: string }>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                resolve({
                  name: file.name,
                  data: reader.result as string,
                });
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
          })
        );

        // Send to main process to save as temp files and get paths back
        const paths = await window.electronAPI.processDroppedFiles(fileData);
        if (paths.length > 0) {
          onDropFiles(paths);
        }
      } catch (error) {
        console.error('[ImagePicker] Error processing dropped files:', error);
      }
    },
    [onDropFiles]
  );

  const hasImages = Array.isArray(images) && images.length > 0;
  const display = (previews.length ? previews : images).slice(0, maxFiles);

  return (
    <Paper
      className="card slide-in"
      elevation={0}
      sx={{ p: 2.5, display: 'flex', flexDirection: 'column', width: '100%' }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {defaults.icon}
          <Box>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2c3338', margin: 0 }}>
              {headerTitle}
            </h3>
            <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>{headerDescription}</p>
          </Box>
        </Box>
        {required && (
          <Chip
            label="Required"
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Box>

      {/* Main area: supports drag & drop */}
      {hasImages ? (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              width: '100%',
              minHeight: 400,
              maxHeight: 400,
              borderRadius: 2,
              overflow: 'hidden',
              border: isDragOver ? '2px dashed rgba(63,81,181,0.4)' : 'none',
              position: 'relative',
              boxShadow: 'none',
              outline: isDragOver ? '2px dashed rgba(63,81,181,0.4)' : 'none',
              WebkitAppRegion: 'no-drag',
            }}
          >
            <SingleImage
              source={display[0]}
              alt={kind === 'target' ? 'Target' : 'Reference'}
              fit="contain"
            />
            {onRemoveImage && (
              <Tooltip title={kind === 'target' ? 'Remove this image' : 'Remove this reference'}>
                <IconButton
                  size="small"
                  onClick={() => onRemoveImage(0)}
                  sx={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    zIndex: 2,
                    background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    color: '#111',
                    border: '1px solid rgba(255,255,255,0.4)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
                    '&:hover': { background: 'rgba(255,255,255,0.75)' },
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {images.length > 1 && (
              <Chip
                label={defaults.countLabel(images.length)}
                size="medium"
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'primary.main',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
          {images.length > 1 && (
            <Box sx={{ mt: 2 }}>
              <ImageGrid
                sources={display.slice(1)}
                columns={4}
                tileHeight={80}
                onRemove={onRemoveImage ? i => onRemoveImage(i + 1) : undefined}
              />
            </Box>
          )}
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: 'background.paper',
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', alignItems: 'center' }}>
              <Button
                variant="outlined"
                onClick={onSelectFiles}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  color: 'primary.main',
                  borderColor: 'primary.main',
                  minWidth: 120,
                  '&:hover': { backgroundColor: 'rgba(91, 102, 112, 0.06)' },
                }}
              >
                {defaults.changeCta}
              </Button>
              {images.length < maxFiles && (
                <Button
                  variant="contained"
                  onClick={onSelectFiles}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 3,
                    py: 1,
                    backgroundColor: 'primary.main',
                    minWidth: 120,
                    '&:hover': { backgroundColor: 'primary.dark' },
                  }}
                >
                  Add More
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box
            onClick={onSelectFiles}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              minHeight: 300,
              maxHeight: 300,
              border: isDragOver ? '2px dashed rgba(63,81,181,0.6)' : 'none',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDragOver ? 'rgba(63,81,181,0.06)' : '#f8f9fa',
              transition: 'all 0.2s',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main', background: 'rgba(91,102,112,0.03)' },
              WebkitAppRegion: 'no-drag',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              {kind === 'target' ? (
                <PhotoCameraOutlinedIcon sx={{ fontSize: 72, color: '#adb5bd', mb: 2 }} />
              ) : (
                <PaletteOutlinedIcon sx={{ fontSize: 72, color: '#adb5bd', mb: 2 }} />
              )}
              <h4 style={{ fontSize: 18, color: '#868e96', marginBottom: 8 }}>
                Drop images here or click to browse
              </h4>
              <p style={{ fontSize: 13, color: '#868e96' }}>
                JPEG, PNG, WebP. Up to {maxFiles} files.
              </p>
            </Box>
          </Box>
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: 'background.paper',
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Button
              variant="contained"
              onClick={onSelectFiles}
              size="medium"
              sx={{
                textTransform: 'none',
                py: 1.5,
                px: 4,
                borderRadius: 2,
                minWidth: 200,
              }}
            >
              {defaults.emptyCta}
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default ImagePicker;
