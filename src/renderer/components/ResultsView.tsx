import React, { useEffect, useState } from 'react';
import { Box, Typography, Chip, Divider, Table, TableBody, TableRow, TableCell } from '@mui/material';
import { ProcessingResult } from '../../shared/types';

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
  // For display only: convert unsupported formats to JPEG (no adjustments)
  const [convertedBase, setConvertedBase] = useState<string | null>(null);
  const [convertedOriginals, setConvertedOriginals] = useState<Record<number, string>>({});
  const [exportOptions, setExportOptions] = useState<Record<number, {
    wbBasic: boolean;
    exposure: boolean;
    hsl: boolean;
    colorGrading: boolean;
    curves: boolean;
    sharpenNoise: boolean;
    vignette: boolean;
  }>>({});

  const successfulResults = results.filter(result => result.success);
  const failedResults = results.filter(result => !result.success);

  useEffect(() => {
    console.log('[RESULTS] Render with results', {
      count: results.length,
      success: successfulResults.length,
      failed: failedResults.length,
      targetCount: targetImages?.length,
      baseImage: _baseImage,
    });
  }, [results, successfulResults.length, failedResults.length, targetImages?.length, _baseImage]);

  const isSafeForImg = (p?: string | null) => {
    if (!p) return false;
    const ext = p.split('.').pop()?.toLowerCase();
    return !!ext && ['jpg','jpeg','png','webp','gif'].includes(ext);
  };

  // Convert base if needed for <img>
  useEffect(() => {
    const run = async () => {
      if (_baseImage && !isSafeForImg(_baseImage)) {
        try {
          const res = await window.electronAPI.generatePreview({ path: _baseImage });
          if (res?.success && res.previewPath) setConvertedBase(res.previewPath);
          else setConvertedBase(_baseImage);
        } catch {
          setConvertedBase(_baseImage);
        }
      } else {
        setConvertedBase(null);
      }
    };
    run();
  }, [_baseImage]);

  // Convert original target images if needed for <img>
  useEffect(() => {
    const run = async () => {
      const map: Record<number, string> = {};
      await Promise.all(results.map(async (_r, idx) => {
        const orig = targetImages[idx];
        if (orig && !isSafeForImg(orig)) {
          try {
            const res = await window.electronAPI.generatePreview({ path: orig });
            if (res?.success && res.previewPath) map[idx] = res.previewPath;
          } catch {}
        }
      }));
      setConvertedOriginals(map);
    };
    run();
  }, [results, targetImages]);

  const defaultOptions = {
    wbBasic: true,
    exposure: false,
    hsl: true,
    colorGrading: true,
    curves: true,
    sharpenNoise: true,
    vignette: true,
  } as const;

  const getOptions = (index: number) => exportOptions[index] || defaultOptions;
  const toggleOption = (index: number, key: keyof ReturnType<typeof getOptions>) => {
    setExportOptions(prev => ({
      ...prev,
      [index]: { ...(prev[index] || defaultOptions), [key]: !(prev[index]?.[key] ?? (defaultOptions as any)[key]) }
    }));
  };

  const handleExportXMP = async (index: number, result: ProcessingResult) => {
    const adjustments = result.metadata?.aiAdjustments;
    if (!adjustments) return;
    try {
      const res = await window.electronAPI.downloadXMP({
        adjustments,
        include: getOptions(index)
      });
      if (!res.success) {
        alert(`Export failed: ${res.error}`);
      }
    } catch (e) {
      console.error('Export error:', e);
      alert('Export failed.');
    }
  };

  // No preview generation effects

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#222', marginBottom: '6px' }}>
          Processing complete
        </h2>
        {results.length > 1 ? (
          <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>
            {successfulResults.length} of {results.length} images processed successfully
          </p>
        ) : results.length === 1 ? (
          <p style={{ fontSize: '14px', color: '#555', marginBottom: '16px' }}>
            {successfulResults.length === 1 ? 'Image processed successfully' : 'Processing failed'}
          </p>
        ) : null}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="button" onClick={onReset}>
            New processing session
          </button>
        </div>
      </div>

      {/* No Results Message */}
      {results.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.5 }}>📭</div>
          <h3 style={{ fontSize: '24px', fontWeight: '600', color: '#666666', marginBottom: '16px' }}>
            No Results Available
          </h3>
          <p style={{ fontSize: '16px', color: '#999999', marginBottom: '30px' }}>
            This project doesn't have any processing results yet, or they failed to load.
          </p>
          <button className="button" onClick={onReset}>
            🔄 Start New Process
          </button>
        </div>
      )}

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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {successfulResults.map((result, index) => (
              <div key={index} className="card slide-in" style={{ animationDelay: `${index * 0.1}s` }}>
                {/* Image Previews: Base vs Result */}
                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Base</div>
                    <div style={{ width: '100%', height: '380px', borderRadius: '12px', overflow: 'hidden', border: '3px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                      {_baseImage && (
                        <img
                          src={(() => {
                            const src = convertedBase || _baseImage;
                            return src.startsWith('file://') ? src : `file://${src}`;
                          })()}
                          alt="Base"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Original</div>
                    <div style={{ width: '100%', height: '380px', borderRadius: '12px', overflow: 'hidden', border: '3px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', position: 'relative' }}>
                      <img
                        src={(() => {
                          const overallIndex = results.indexOf(result);
                          const orig = convertedOriginals[overallIndex] || targetImages[overallIndex];
                          const src = orig || '';
                          return src?.startsWith('file://') ? src : `file://${src}`;
                        })()}
                        alt={`Processed image ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
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

                {/* Project Details and Export (inline) */}
                {result.metadata?.aiAdjustments && (
                  <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '12px', marginTop: '8px' }}>
                    <div style={{ 
                      background: '#f8f9ff', 
                      border: '1px solid #e8eaff',
                      borderRadius: '8px',
                      padding: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🤖</span>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#667eea' }}>AI Analysis</span>
                        <span style={{ background: '#667eea', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: '600' }}>
                          {Math.round((result.metadata.aiAdjustments.confidence || 0) * 100)}%
                        </span>
                      </div>

                      {/* Nicer presentation using MUI */}
                      <Table size="small" sx={{ '& td, & th': { borderBottom: '1px dashed #e5e7eb' } }}>
                        <TableBody>
                          <TableRow><TableCell>Temperature</TableCell><TableCell align="right">{Math.round(result.metadata.aiAdjustments.temperature || 0)} K</TableCell></TableRow>
                          <TableRow><TableCell>Tint</TableCell><TableCell align="right">{Math.round(result.metadata.aiAdjustments.tint || 0)}</TableCell></TableRow>
                          <TableRow><TableCell>Exposure</TableCell><TableCell align="right">{(result.metadata.aiAdjustments.exposure || 0).toFixed(2)} stops</TableCell></TableRow>
                          <TableRow><TableCell>Contrast</TableCell><TableCell align="right">{result.metadata.aiAdjustments.contrast ?? 0}</TableCell></TableRow>
                          <TableRow><TableCell>Highlights</TableCell><TableCell align="right">{result.metadata.aiAdjustments.highlights ?? 0}</TableCell></TableRow>
                          <TableRow><TableCell>Shadows</TableCell><TableCell align="right">{result.metadata.aiAdjustments.shadows ?? 0}</TableCell></TableRow>
                          <TableRow><TableCell>Whites</TableCell><TableCell align="right">{result.metadata.aiAdjustments.whites ?? 0}</TableCell></TableRow>
                          <TableRow><TableCell>Blacks</TableCell><TableCell align="right">{result.metadata.aiAdjustments.blacks ?? 0}</TableCell></TableRow>
                          <TableRow><TableCell>Clarity</TableCell><TableCell align="right">{result.metadata.aiAdjustments.clarity ?? 0}</TableCell></TableRow>
                          <TableRow><TableCell>Vibrance</TableCell><TableCell align="right">{result.metadata.aiAdjustments.vibrance ?? 0}</TableCell></TableRow>
                          <TableRow><TableCell>Saturation</TableCell><TableCell align="right">{result.metadata.aiAdjustments.saturation ?? 0}</TableCell></TableRow>
                        </TableBody>
                      </Table>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#444' }}>HSL Hue</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {(['red','orange','yellow','green','aqua','blue','purple','magenta'] as const).map(k => (
                          <Chip key={`hue_${k}`} size="small" label={`${k[0].toUpperCase()} ${(result.metadata!.aiAdjustments as any)[`hue_${k}`] ?? 0}`} />
                        ))}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#444', mt: 1, display: 'block' }}>HSL Saturation</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {(['red','orange','yellow','green','aqua','blue','purple','magenta'] as const).map(k => (
                          <Chip key={`sat_${k}`} size="small" label={`${k[0].toUpperCase()} ${(result.metadata!.aiAdjustments as any)[`sat_${k}`] ?? 0}`} />
                        ))}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#444', mt: 1, display: 'block' }}>HSL Luminance</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {(['red','orange','yellow','green','aqua','blue','purple','magenta'] as const).map(k => (
                          <Chip key={`lum_${k}`} size="small" label={`${k[0].toUpperCase()} ${(result.metadata!.aiAdjustments as any)[`lum_${k}`] ?? 0}`} />
                        ))}
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#444' }}>Color Grading</Typography>
                      <Table size="small" sx={{ '& td, & th': { borderBottom: '1px dashed #e5e7eb' }, mt: 0.5 }}>
                        <TableBody>
                          <TableRow><TableCell>Shadows</TableCell><TableCell align="right">H {(result.metadata.aiAdjustments as any).color_grade_shadow_hue ?? 0}° / S {(result.metadata.aiAdjustments as any).color_grade_shadow_sat ?? 0} / L {(result.metadata.aiAdjustments as any).color_grade_shadow_lum ?? 0}</TableCell></TableRow>
                          <TableRow><TableCell>Midtones</TableCell><TableCell align="right">H {(result.metadata.aiAdjustments as any).color_grade_midtone_hue ?? 0}° / S {(result.metadata.aiAdjustments as any).color_grade_midtone_sat ?? 0} / L {(result.metadata.aiAdjustments as any).color_grade_midtone_lum ?? 0}</TableCell></TableRow>
                          <TableRow><TableCell>Highlights</TableCell><TableCell align="right">H {(result.metadata.aiAdjustments as any).color_grade_highlight_hue ?? 0}° / S {(result.metadata.aiAdjustments as any).color_grade_highlight_sat ?? 0} / L {(result.metadata.aiAdjustments as any).color_grade_highlight_lum ?? 0}</TableCell></TableRow>
                          <TableRow><TableCell>Global</TableCell><TableCell align="right">H {(result.metadata.aiAdjustments as any).color_grade_global_hue ?? 0}° / S {(result.metadata.aiAdjustments as any).color_grade_global_sat ?? 0} / L {(result.metadata.aiAdjustments as any).color_grade_global_lum ?? 0}</TableCell></TableRow>
                          <TableRow><TableCell>Blending</TableCell><TableCell align="right">{(result.metadata.aiAdjustments as any).color_grade_blending ?? 50}</TableCell></TableRow>
                        </TableBody>
                      </Table>
                      {typeof result.metadata.aiAdjustments.reasoning === 'string' && result.metadata.aiAdjustments.reasoning.trim().length > 0 && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#444' }}>AI Notes</Typography>
                          <Box sx={{ mt: 0.5, fontSize: 12, color: '#374151', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 1, p: 1.25, whiteSpace: 'pre-wrap' }}>
                            {result.metadata.aiAdjustments.reasoning}
                          </Box>
                        </>
                      )}
                    </div>

                    {/* Export options */}
                    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: '#333' }}>Export XMP Options</div>
                      <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        {([
                          { key: 'exposure', label: 'Exposure (separate)' },
                          { key: 'wbBasic', label: 'Basic Adjustments' },
                          { key: 'hsl', label: 'HSL Adjustments' },
                          { key: 'colorGrading', label: 'Color Grading' },
                          { key: 'curves', label: 'Tone Curves' },
                          { key: 'sharpenNoise', label: 'Sharpen & Noise' },
                          { key: 'vignette', label: 'Vignette' },
                        ] as const).map(opt => (
                          <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="checkbox" checked={getOptions(index)[opt.key as keyof ReturnType<typeof getOptions>] as any}
                              onChange={() => toggleOption(index, opt.key as any)} />
                            <span style={{ fontSize: '12px', color: '#444' }}>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <button className="button" onClick={() => handleExportXMP(index, result)}>📋 Export XMP</button>
                      </div>
                    </div>
                  </div>
                )}

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

      {/* No modal; export is inline per result */}
    </div>
  );
};

export default ResultsView;
