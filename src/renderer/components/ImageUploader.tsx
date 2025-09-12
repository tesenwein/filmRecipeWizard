import React, { useState, useEffect } from 'react';

interface ImageUploaderProps {
  onImagesSelected: (baseImage: string, targetImages: string[]) => void;
  onStartProcessing: () => void;
  baseImage: string | null;
  targetImages: string[];
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesSelected,
  onStartProcessing,
  baseImage,
  targetImages
}) => {
  const [targetPreviews, setTargetPreviews] = useState<string[]>([]);
  const [baseDisplay, setBaseDisplay] = useState<string | null>(null);

  const isSafeForImg = (p?: string | null) => {
    if (!p) return false;
    const ext = p.split('.').pop()?.toLowerCase();
    return !!ext && ['jpg','jpeg','png','webp','gif'].includes(ext);
  };

  const handleBaseImageSelect = async () => {
    try {
      const result = await window.electronAPI.selectFiles({
        title: 'Select Base Image (Reference Style)',
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'dng', 'cr2', 'nef', 'arw'] }
        ],
        properties: ['openFile']
      });

      if (result && result.length > 0) {
        onImagesSelected(result[0], targetImages);
      }
    } catch (error) {
      console.error('Error selecting base image:', error);
    }
  };

  const handleTargetImagesSelect = async () => {
    try {
      const result = await window.electronAPI.selectFiles({
        title: 'Select Target Images to Process',
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'dng', 'cr2', 'nef', 'arw'] }
        ],
        properties: ['openFile', 'multiSelections']
      });

      if (result && result.length > 0) {
        onImagesSelected(baseImage || '', result);
      }
    } catch (error) {
      console.error('Error selecting target images:', error);
    }
  };

  const canProcess = baseImage && targetImages.length > 0;

  // Convert base image for display if unsupported
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

  // Generate previews for target images
  useEffect(() => {
    const generateTargetPreviews = async () => {
      if (targetImages.length === 0) {
        setTargetPreviews([]);
        return;
      }

      try {
        const previews = await Promise.all(
          targetImages.map(async (imagePath) => {
            try {
              const result = await window.electronAPI.generatePreview({ path: imagePath });
              return result.success ? result.previewPath : imagePath;
            } catch (error) {
              console.error('Error generating preview for target image:', error);
              return imagePath;
            }
          })
        );
        setTargetPreviews(previews);
      } catch (error) {
        console.error('Error generating target previews:', error);
        setTargetPreviews(targetImages); // Fallback to original paths
      }
    };

    generateTargetPreviews();
  }, [targetImages]);

  return (
    <div className="grid grid-2">
      <div className="card slide-in">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🎨
          </div>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#333333', 
            marginBottom: '8px' 
          }}>
            Reference Image
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: '#666666', 
            marginBottom: '24px',
            lineHeight: '1.5'
          }}>
            Select the image with the style and color grading you want to match
          </p>

          {baseImage ? (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                width: '300px',
                height: '200px',
                borderRadius: '12px',
                overflow: 'hidden',
                margin: '0 auto',
                border: '3px solid #667eea',
                position: 'relative',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.2)'
              }}>
                {baseDisplay && (
                  <img 
                    src={baseDisplay.startsWith('file://') ? baseDisplay : `file://${baseDisplay}`}
                    alt="Base image"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(102, 126, 234, 0.95)',
                  color: 'white',
                  borderRadius: '16px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: '600',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  ✓ Reference
                </div>
              </div>
              <p style={{ 
                fontSize: '13px', 
                color: '#555555', 
                marginTop: '12px',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {(baseImage || '').split('/').pop()}
              </p>
            </div>
          ) : (
            <div style={{
              width: '300px',
              height: '200px',
              border: '3px dashed #d0d0d0',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              background: '#fafafa',
              color: '#999999',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              No image selected
            </div>
          )}

          <button
            className="button"
            onClick={handleBaseImageSelect}
            style={{ width: '100%' }}
          >
            📂 Select Reference Image
          </button>
        </div>
      </div>

      <div className="card slide-in" style={{ animationDelay: '0.1s' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ 
            fontSize: '48px', 
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            📸
          </div>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#333333', 
            marginBottom: '8px' 
          }}>
            Target Images
          </h3>
          <p style={{ 
            fontSize: '14px', 
            color: '#666666', 
            marginBottom: '24px',
            lineHeight: '1.5'
          }}>
            Select the images you want to process and match to the reference style
          </p>

          {targetImages.length > 0 ? (
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: targetImages.length === 1 ? '1fr' : '1fr 1fr',
                gap: '12px',
                maxHeight: '200px',
                overflow: 'hidden',
                width: '300px',
                margin: '0 auto'
              }}>
                {targetImages.slice(0, 4).map((imgPath, index) => {
                  const previewPath = targetPreviews[index] || imgPath;
                  return (
                  <div
                    key={index}
                    style={{
                      width: '100%',
                      height: targetImages.length === 1 ? '180px' : '90px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '2px solid #e0e0e0',
                      position: 'relative',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <img
                      src={`file://${previewPath}`}
                      alt={`Target image ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      background: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      borderRadius: '8px',
                      padding: '2px 6px',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>
                      {index + 1}
                    </div>
                  </div>
                  );
                })}
              </div>
              {targetImages.length > 4 && (
                <p style={{ 
                  fontSize: '13px', 
                  color: '#667eea', 
                  marginTop: '12px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  +{targetImages.length - 4} more images
                </p>
              )}
              <p style={{ 
                fontSize: '13px', 
                color: '#555555', 
                marginTop: '8px',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {targetImages.length} image{targetImages.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          ) : (
            <div style={{
              width: '300px',
              height: '200px',
              border: '3px dashed #d0d0d0',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              background: '#fafafa',
              color: '#999999',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              No images selected
            </div>
          )}

          <button
            className="button"
            onClick={handleTargetImagesSelect}
            style={{ width: '100%' }}
          >
            📂 Select Target Images
          </button>
        </div>
      </div>

      {canProcess && (
        <div className="fade-in" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
          <div className="card" style={{ 
            background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
            border: '1px solid #e8eaff',
            boxShadow: '0 2px 12px rgba(102, 126, 234, 0.08)'
          }}>
            <h3 style={{ 
              fontSize: '20px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: '#333'
            }}>
              Ready to Process
            </h3>
            <p style={{ 
              fontSize: '14px', 
              marginBottom: '24px',
              color: '#666',
              lineHeight: '1.5'
            }}>
              AI will analyze your reference image and generate complete color adjustments for all target images.
              You'll be able to selectively export XMP presets with your desired adjustments.
            </p>
            <button
              className="button"
              onClick={onStartProcessing}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                padding: '14px 32px',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.2)'
              }}
            >
              Start Processing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
