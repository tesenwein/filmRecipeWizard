import React, { useState } from 'react';
import { ProcessingResult } from '../../shared/types';

interface XMPExportModalProps {
  result: ProcessingResult;
  onClose: () => void;
}

interface ExportOptions {
  wbBasic: boolean;
  exposure: boolean;
  hsl: boolean;
  colorGrading: boolean;
  curves: boolean;
  sharpenNoise: boolean;
  vignette: boolean;
}

const XMPExportModal: React.FC<XMPExportModalProps> = ({
  result,
  onClose
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    wbBasic: true,
    exposure: false,
    hsl: true,
    colorGrading: true,
    curves: true,
    sharpenNoise: true,
    vignette: true
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleOptionChange = (key: keyof ExportOptions) => {
    setExportOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleExport = async () => {
    if (!result.metadata?.aiAdjustments) return;

    setIsExporting(true);
    try {
      const exportResult = await window.electronAPI.downloadXMP({
        adjustments: result.metadata.aiAdjustments,
        include: exportOptions
      });

      if (exportResult.success) {
        // Silent success: close the modal without showing filesystem path
        onClose();
      } else {
        alert(`Export failed: ${exportResult.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed: Unknown error');
    } finally {
      setIsExporting(false);
    }
  };

  const adjustments = result.metadata?.aiAdjustments;
  if (!adjustments) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 0',
          borderBottom: '1px solid #f0f0f0',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#333333',
                marginBottom: '8px'
              }}>
                Export XMP Preset
              </h2>
              <p style={{ 
                fontSize: '14px', 
                color: '#666666'
              }}>
                Select which adjustments to include in your Lightroom preset
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#999999',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '12px'
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <div className="grid grid-2" style={{ gap: '24px' }}>
            {/* AI Analysis Summary */}
            <div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#333333',
                marginBottom: '16px'
              }}>
                AI Analysis Summary
              </h3>
              
              <div style={{ 
                background: '#f8f9ff', 
                border: '1px solid #e8eaff',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <span style={{ fontSize: '20px' }}>🤖</span>
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: '600', 
                    color: '#667eea'
                  }}>
                    Confidence: {Math.round((adjustments.confidence || 0) * 100)}%
                  </span>
                </div>
                
                {adjustments.reasoning && (
                  <p style={{ 
                    fontSize: '14px', 
                    color: '#555555',
                    lineHeight: '1.5',
                    fontStyle: 'italic'
                  }}>
                    "{adjustments.reasoning}"
                  </p>
                )}
              </div>

              {/* All Adjustments */}
              <div style={{
                background: '#ffffff',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <h4 style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#333333',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  All Adjustments
                </h4>

                <div style={{ display: 'grid', gap: '8px', fontSize: '13px', color: '#555555' }}>
                  {/* WB & Basic */}
                  <div><strong>Temperature:</strong> {Math.round(adjustments.temperature || 0)}K</div>
                  <div><strong>Tint:</strong> {Math.round(adjustments.tint || 0)}</div>
                  <div><strong>Exposure:</strong> {(adjustments.exposure || 0).toFixed(2)} stops</div>
                  <div><strong>Contrast:</strong> {adjustments.contrast}</div>
                  <div><strong>Highlights:</strong> {adjustments.highlights}</div>
                  <div><strong>S hadows:</strong> {adjustments.shadows}</div>
                  <div><strong>Whites:</strong> {adjustments.whites}</div>
                  <div><strong>Blacks:</strong> {adjustments.blacks}</div>
                  <div><strong>Clarity:</strong> {adjustments.clarity}</div>
                  <div><strong>Texture:</strong> {(adjustments as any).texture ?? 0}</div>
                  <div><strong>Dehaze:</strong> {(adjustments as any).dehaze ?? 0}</div>
                  <div><strong>Vibrance:</strong> {adjustments.vibrance}</div>
                  <div><strong>Saturation:</strong> {adjustments.saturation}</div>

                  {/* HSL (Hue only for now if provided) */}
                  <div style={{ marginTop: '8px', fontWeight: 600, color: '#333' }}>Hue Shifts</div>
                  <div>Red: {(adjustments as any).hue_red}</div>
                  <div>Orange: {(adjustments as any).hue_orange}</div>
                  <div>Yellow: {(adjustments as any).hue_yellow}</div>
                  <div>Green: {(adjustments as any).hue_green}</div>
                  <div>Aqua: {(adjustments as any).hue_aqua}</div>
                  <div>Blue: {(adjustments as any).hue_blue}</div>
                  <div>Purple: {(adjustments as any).hue_purple}</div>
                  <div>Magenta: {(adjustments as any).hue_magenta}</div>

                  {/* Color Grading */}
                  <div style={{ marginTop: '8px', fontWeight: 600, color: '#333' }}>Color Grading</div>
                  <div>Shadows: H {Math.round((adjustments as any).color_grade_shadow_hue ?? 0)}° / S {(adjustments as any).color_grade_shadow_sat ?? 0} / L {(adjustments as any).color_grade_shadow_lum ?? 0}</div>
                  <div>Midtones: H {Math.round((adjustments as any).color_grade_midtone_hue ?? 0)}° / S {(adjustments as any).color_grade_midtone_sat ?? 0} / L {(adjustments as any).color_grade_midtone_lum ?? 0}</div>
                  <div>Highlights: H {Math.round((adjustments as any).color_grade_highlight_hue ?? 0)}° / S {(adjustments as any).color_grade_highlight_sat ?? 0} / L {(adjustments as any).color_grade_highlight_lum ?? 0}</div>
                  <div>Global: H {Math.round((adjustments as any).color_grade_global_hue ?? 0)}° / S {(adjustments as any).color_grade_global_sat ?? 0} / L {(adjustments as any).color_grade_global_lum ?? 0}</div>
                  <div>Blending: {(adjustments as any).color_grade_blending ?? 50}</div>

                  {/* Tone Curves summary */}
                  <div style={{ marginTop: '8px', fontWeight: 600, color: '#333' }}>Tone Curves</div>
                  <div>Composite points: {(adjustments as any).tone_curve?.length ?? 0}</div>
                  <div>Red points: {(adjustments as any).tone_curve_red?.length ?? 0}</div>
                  <div>Green points: {(adjustments as any).tone_curve_green?.length ?? 0}</div>
                  <div>Blue points: {(adjustments as any).tone_curve_blue?.length ?? 0}</div>

                  {/* Detail & Vignette */}
                  <div style={{ marginTop: '8px', fontWeight: 600, color: '#333' }}>Detail / Vignette</div>
                  <div>Sharpening: {(adjustments as any).sharpening ?? 0} (radius {(adjustments as any).sharpening_radius ?? 1.0}, detail {(adjustments as any).sharpening_detail ?? 25}, masking {(adjustments as any).sharpening_masking ?? 0})</div>
                  <div>Noise Reduction: Luma {(adjustments as any).luminance_noise_reduction ?? 0} / Color {(adjustments as any).color_noise_reduction ?? 0}</div>
                  <div>Vignette: {(adjustments as any).vignette ?? 0}</div>
                </div>
              </div>
            </div>

            {/* Export Options */}
            <div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#333333',
                marginBottom: '16px'
              }}>
                Export Options
              </h3>

              <div style={{ display: 'grid', gap: '12px' }}>
                {[
                  { 
                    key: 'exposure' as keyof ExportOptions, 
                    label: 'Exposure (separate)', 
                    desc: 'Include exposure independently from other basic adjustments' 
                  },
                  { 
                    key: 'wbBasic' as keyof ExportOptions, 
                    label: 'Basic Adjustments', 
                    desc: 'White balance, contrast, highlights, shadows, whites, blacks (exposure selectable separately)' 
                  },
                  { 
                    key: 'hsl' as keyof ExportOptions, 
                    label: 'HSL Adjustments', 
                    desc: 'Hue, saturation, and luminance adjustments for individual colors' 
                  },
                  { 
                    key: 'colorGrading' as keyof ExportOptions, 
                    label: 'Color Grading', 
                    desc: 'Shadow, midtone, highlight, and global color wheels' 
                  },
                  { 
                    key: 'curves' as keyof ExportOptions, 
                    label: 'Tone Curves', 
                    desc: 'RGB and composite tone curve adjustments' 
                  },
                  { 
                    key: 'sharpenNoise' as keyof ExportOptions, 
                    label: 'Sharpening & Noise', 
                    desc: 'Sharpening and noise reduction settings' 
                  },
                  { 
                    key: 'vignette' as keyof ExportOptions, 
                    label: 'Vignette', 
                    desc: 'Post-crop vignetting adjustments' 
                  }
                ].map(option => (
                  <label 
                    key={option.key}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '16px',
                      border: `2px solid ${exportOptions[option.key] ? '#667eea' : '#e0e0e0'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: exportOptions[option.key] ? '#f8f9ff' : '#ffffff'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={exportOptions[option.key]}
                      onChange={() => handleOptionChange(option.key)}
                      style={{
                        width: '18px',
                        height: '18px',
                        accentColor: '#667eea',
                        marginTop: '2px'
                      }}
                    />
                    <div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#333333',
                        marginBottom: '4px'
                      }}>
                        {option.label}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#666666',
                        lineHeight: '1.4'
                      }}>
                        {option.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            marginTop: '32px',
            display: 'flex',
            gap: '16px',
            justifyContent: 'flex-end'
          }}>
            <button
              className="button-secondary"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </button>
            
            <button
              className="button"
              onClick={handleExport}
              disabled={isExporting}
              style={{
                minWidth: '140px'
              }}
            >
              {isExporting ? (
                <>
                  <span style={{ 
                    animation: 'spin 1s linear infinite',
                    display: 'inline-block'
                  }}>⚡</span>
                  Exporting...
                </>
              ) : (
                <>📋 Export XMP</>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default XMPExportModal;
