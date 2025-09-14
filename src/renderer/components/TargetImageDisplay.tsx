import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { Button, Chip, Box, Paper } from '@mui/material';
import React from 'react';
import SingleImage from './SingleImage';
import ImageGrid from './ImageGrid';

interface TargetImageDisplayProps {
  targetImages: string[];
  targetPreviews: string[];
  onSelectImages: () => void;
}

const TargetImageDisplay: React.FC<TargetImageDisplayProps> = ({
  targetImages,
  targetPreviews,
  onSelectImages,
}) => {
  return (
    <Paper className="card slide-in" sx={{ p: 2.5, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhotoCameraOutlinedIcon sx={{ color: 'primary.main', fontSize: 24 }} />
          <Box>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#2c3338', margin: 0 }}>
              Target Image
            </h3>
            <p style={{ fontSize: 12, color: '#5f6b74', margin: 0 }}>
              The photo you want to transform
            </p>
          </Box>
        </Box>
        <Chip label="Required" size="small" color="primary" variant="outlined" />
      </Box>

      {/* Large Target Image Display */}
      {targetImages.length > 0 ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{
            width: '100%',
            flex: 1,
            minHeight: 350,
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid #e9ecef',
            position: 'relative',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
          }}>
            {(() => {
              const previewPath = targetPreviews[0] || targetImages[0];
              return (
                <SingleImage source={previewPath} alt="Target" fit="cover" />
              );
            })()}
            <Chip
              label={`${targetImages.length} image${targetImages.length !== 1 ? 's' : ''} selected`}
              size="medium"
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'primary.main',
                color: 'white',
                fontSize: 12,
                fontWeight: 600
              }}
            />
          </Box>
          {targetImages.length > 1 && (
            <Box sx={{ mt: 2 }}>
              <ImageGrid sources={(targetPreviews.length ? targetPreviews : targetImages).slice(1)} columns={4} tileHeight={80} />
            </Box>
          )}
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#2c3338', fontWeight: 500, marginBottom: 12 }}>
              {targetImages[0].split('/').pop()}
            </p>
            <Button
              variant="outlined"
              onClick={onSelectImages}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                py: 1,
                color: 'primary.main',
                borderColor: 'primary.main',
                '&:hover': { backgroundColor: 'rgba(91, 102, 112, 0.06)' }
              }}
            >
              Change Images
            </Button>
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{
            flex: 1,
            minHeight: 350,
            border: '2px dashed #e9ecef',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8f9fa',
            transition: 'all 0.2s',
            cursor: 'pointer',
            '&:hover': { borderColor: 'primary.main', background: 'rgba(91,102,112,0.03)' }
          }}
          onClick={onSelectImages}
          >
            <Box sx={{ textAlign: 'center' }}>
              <PhotoCameraOutlinedIcon sx={{ fontSize: 72, color: '#adb5bd', mb: 2 }} />
              <h4 style={{ fontSize: 18, color: '#868e96', marginBottom: 8 }}>No images selected</h4>
              <p style={{ fontSize: 13, color: '#868e96' }}>Click to choose photos to transform</p>
            </Box>
          </Box>
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="contained"
              onClick={onSelectImages}
              size="large"
              sx={{ textTransform: 'none', fontWeight: 700, py: 1.5, px: 4, borderRadius: 2, fontSize: 16 }}
            >
              Select Target Images
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default TargetImageDisplay;
