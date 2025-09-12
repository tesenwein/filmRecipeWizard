import React, { useEffect, useState } from 'react';
import { ProcessingResult } from './App';

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
  // No preview image processing
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

  const defaultOptions = {
    wbBasic: true,
    exposure: false,
    hsl: true,
    colorGrading: true,
    curves: true,
    sharpenNoise: true,
    vignette: true
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
                    <div style={{ width: '100%', height: '260px', borderRadius: '12px', overflow: 'hidden', border: '3px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                      {_baseImage && (
                        <img
                          src={`file://${_baseImage}`}
                          alt="Base"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Processed</div>
                    <div style={{ width: '100%', height: '260px', borderRadius: '12px', overflow: 'hidden', border: '3px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', position: 'relative' }}>
                      <img
                        src={(() => {
                          // Show the processed output image, not the original
                          const processedPath = result.outputPath;
                          if (!processedPath) {
                            // Fallback to original if no processed image available
                            const overallIndex = results.indexOf(result);
                            const fallback = targetImages[overallIndex];
                            return fallback?.startsWith('file://') ? fallback : `file://${fallback}`;
                          }
                          return processedPath?.startsWith('file://') ? processedPath : `file://${processedPath}`;
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

                      {/* All Adjustments summary */}
                      <div style={{ display: 'grid', gap: '6px', fontSize: '12px', color: '#555555' }}>
                        {/* WB & Basic */}
                        <div><strong>Temperature:</strong> {Math.round(result.metadata.aiAdjustments.temperature)}K</div>
                        <div><strong>Tint:</strong> {Math.round(result.metadata.aiAdjustments.tint)}</div>
                        <div><strong>Exposure:</strong> {result.metadata.aiAdjustments.exposure.toFixed(2)} stops</div>
                        <div><strong>Contrast:</strong> {result.metadata.aiAdjustments.contrast}</div>
                        <div><strong>Highlights:</strong> {result.metadata.aiAdjustments.highlights}</div>
                        <div><strong>Shadows:</strong> {result.metadata.aiAdjustments.shadows}</div>
                        <div><strong>Whites:</strong> {result.metadata.aiAdjustments.whites}</div>
                        <div><strong>Blacks:</strong> {result.metadata.aiAdjustments.blacks}</div>
                        <div><strong>Clarity:</strong> {result.metadata.aiAdjustments.clarity}</div>
                        <div><strong>Vibrance:</strong> {result.metadata.aiAdjustments.vibrance}</div>
                        <div><strong>Saturation:</strong> {result.metadata.aiAdjustments.saturation}</div>
                        <div><strong>Texture:</strong> {(result.metadata.aiAdjustments as any).texture ?? 0}</div>
                        <div><strong>Dehaze:</strong> {(result.metadata.aiAdjustments as any).dehaze ?? 0}</div>

                        {/* Tone Curves */}
                        <div><strong>Tone Curve points:</strong> {(result.metadata.aiAdjustments as any).tone_curve?.length ?? 0} (R {(result.metadata.aiAdjustments as any).tone_curve_red?.length ?? 0} / G {(result.metadata.aiAdjustments as any).tone_curve_green?.length ?? 0} / B {(result.metadata.aiAdjustments as any).tone_curve_blue?.length ?? 0})</div>

                        {/* Parametric Regions */}
                        <div><strong>Parametric Shadows/Darks/Lights/Highlights:</strong> {(result.metadata.aiAdjustments as any).parametric_shadows ?? 0} / {(result.metadata.aiAdjustments as any).parametric_darks ?? 0} / {(result.metadata.aiAdjustments as any).parametric_lights ?? 0} / {(result.metadata.aiAdjustments as any).parametric_highlights ?? 0}</div>
                        <div><strong>Parametric Splits (S/M/H):</strong> {(result.metadata.aiAdjustments as any).parametric_shadow_split ?? 25} / {(result.metadata.aiAdjustments as any).parametric_midtone_split ?? 50} / {(result.metadata.aiAdjustments as any).parametric_highlight_split ?? 75}</div>

                        {/* HSL Hue */}
                        <div style={{ marginTop: '6px', fontWeight: 600, color: '#444' }}>HSL Hue</div>
                        <div>R {(result.metadata.aiAdjustments as any).hue_red ?? 0}, O {(result.metadata.aiAdjustments as any).hue_orange ?? 0}, Y {(result.metadata.aiAdjustments as any).hue_yellow ?? 0}, G {(result.metadata.aiAdjustments as any).hue_green ?? 0}, A {(result.metadata.aiAdjustments as any).hue_aqua ?? 0}, B {(result.metadata.aiAdjustments as any).hue_blue ?? 0}, P {(result.metadata.aiAdjustments as any).hue_purple ?? 0}, M {(result.metadata.aiAdjustments as any).hue_magenta ?? 0}</div>

                        {/* HSL Saturation */}
                        <div style={{ marginTop: '6px', fontWeight: 600, color: '#444' }}>HSL Saturation</div>
                        <div>R {(result.metadata.aiAdjustments as any).sat_red ?? 0}, O {(result.metadata.aiAdjustments as any).sat_orange ?? 0}, Y {(result.metadata.aiAdjustments as any).sat_yellow ?? 0}, G {(result.metadata.aiAdjustments as any).sat_green ?? 0}, A {(result.metadata.aiAdjustments as any).sat_aqua ?? 0}, B {(result.metadata.aiAdjustments as any).sat_blue ?? 0}, P {(result.metadata.aiAdjustments as any).sat_purple ?? 0}, M {(result.metadata.aiAdjustments as any).sat_magenta ?? 0}</div>

                        {/* HSL Luminance */}
                        <div style={{ marginTop: '6px', fontWeight: 600, color: '#444' }}>HSL Luminance</div>
                        <div>R {(result.metadata.aiAdjustments as any).lum_red ?? 0}, O {(result.metadata.aiAdjustments as any).lum_orange ?? 0}, Y {(result.metadata.aiAdjustments as any).lum_yellow ?? 0}, G {(result.metadata.aiAdjustments as any).lum_green ?? 0}, A {(result.metadata.aiAdjustments as any).lum_aqua ?? 0}, B {(result.metadata.aiAdjustments as any).lum_blue ?? 0}, P {(result.metadata.aiAdjustments as any).lum_purple ?? 0}, M {(result.metadata.aiAdjustments as any).lum_magenta ?? 0}</div>

                        {/* Color Grading */}
                        <div style={{ marginTop: '6px', fontWeight: 600, color: '#444' }}>Color Grading</div>
                        <div>Shadows: H {(result.metadata.aiAdjustments as any).color_grade_shadow_hue ?? 0}° / S {(result.metadata.aiAdjustments as any).color_grade_shadow_sat ?? 0} / L {(result.metadata.aiAdjustments as any).color_grade_shadow_lum ?? 0}</div>
                        <div>Midtones: H {(result.metadata.aiAdjustments as any).color_grade_midtone_hue ?? 0}° / S {(result.metadata.aiAdjustments as any).color_grade_midtone_sat ?? 0} / L {(result.metadata.aiAdjustments as any).color_grade_midtone_lum ?? 0}</div>
                        <div>Highlights: H {(result.metadata.aiAdjustments as any).color_grade_highlight_hue ?? 0}° / S {(result.metadata.aiAdjustments as any).color_grade_highlight_sat ?? 0} / L {(result.metadata.aiAdjustments as any).color_grade_highlight_lum ?? 0}</div>
                        <div>Global: H {(result.metadata.aiAdjustments as any).color_grade_global_hue ?? 0}° / S {(result.metadata.aiAdjustments as any).color_grade_global_sat ?? 0} / L {(result.metadata.aiAdjustments as any).color_grade_global_lum ?? 0}</div>
                        <div>Blending: {(result.metadata.aiAdjustments as any).color_grade_blending ?? 50}</div>

                        {/* Detail & Vignette */}
                        <div style={{ marginTop: '6px', fontWeight: 600, color: '#444' }}>Detail / Vignette</div>
                        <div>Sharpen: {(result.metadata.aiAdjustments as any).sharpening ?? 0} (radius {(result.metadata.aiAdjustments as any).sharpening_radius ?? 1.0}, detail {(result.metadata.aiAdjustments as any).sharpening_detail ?? 25}, masking {(result.metadata.aiAdjustments as any).sharpening_masking ?? 0})</div>
                        <div>Noise Reduction: Luma {(result.metadata.aiAdjustments as any).luminance_noise_reduction ?? 0} / Color {(result.metadata.aiAdjustments as any).color_noise_reduction ?? 0}</div>
                        <div>Vignette: {(result.metadata.aiAdjustments as any).vignette ?? 0}</div>
                      </div>
                    </div>

                    {/* Export options + action */}
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
                        <button className="button" onClick={() => handleExportXMP(index, result)}>
                          📋 Export XMP
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

      {/* No modal; export is inline per result */}
    </div>
  );
};

export default ResultsView;
