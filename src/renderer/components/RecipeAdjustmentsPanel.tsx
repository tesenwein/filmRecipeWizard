import { Box, Chip, Divider, Paper, Typography } from '@mui/material';
import React, { useMemo } from 'react';
import type { AIColorAdjustments } from '../../services/types';
import { Recipe, StyleOptions } from '../../shared/types';

type Maybe<T> = T | undefined | null;

export interface RecipeAdjustmentsPanelProps {
  recipe: Recipe;
  pendingModifications?: {
    userOptions?: Partial<StyleOptions>;
    aiAdjustments?: {
      grain_amount?: number;
      grain_size?: number;
      grain_frequency?: number;
      vignette_amount?: number;
      vignette_midpoint?: number;
      vignette_feather?: number;
      vignette_roundness?: number;
      vignette_style?: number;
      vignette_highlight_contrast?: number;
    };
    prompt?: string;
    name?: string;
    description?: string;
    masks?: any[];
  } | null;
  aiAdjustments?: AIColorAdjustments | null;
  showOnlyCurrent?: boolean;
}

function fmtNum(v: any): string {
  if (v === undefined || v === null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}


function str(v: Maybe<string>): string {
  const s = (v ?? '').toString().trim();
  return s.length ? s : '—';
}

function hasChange(a: any, b: any): boolean {
  // Simple deep-ish comparison for primitives/objects used here
  try {
    return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
  } catch {
    return a !== b;
  }
}


export const RecipeAdjustmentsPanel: React.FC<RecipeAdjustmentsPanelProps> = ({ recipe, pendingModifications, aiAdjustments, showOnlyCurrent }) => {
  const current = (recipe.userOptions || {}) as StyleOptions;
  const proposed = useMemo<StyleOptions>(() => {
    const mods = pendingModifications?.userOptions || {};
    const merged: StyleOptions = { ...current, ...mods };
    // Merge nested artist/film objects wholesale if provided
    if ((mods as any).artistStyle) merged.artistStyle = (mods as any).artistStyle;
    if ((mods as any).filmStyle) merged.filmStyle = (mods as any).filmStyle;
    return merged;
  }, [current, pendingModifications]);

  // Create effective aiAdjustments that include pending modifications
  const effectiveAiAdjustments = useMemo(() => {
    if (!aiAdjustments) return null;
    const pendingAiMods = pendingModifications?.aiAdjustments || {};
    return { ...aiAdjustments, ...pendingAiMods };
  }, [aiAdjustments, pendingModifications]);

  // Name changes are not supported via AI chat; hide name row in adjustments panel
  const descriptionChange = (pendingModifications && Object.prototype.hasOwnProperty.call(pendingModifications, 'description'))
    ? hasChange((recipe as any).description, (pendingModifications as any).description)
    : false;

  const Row = ({ label, cur, next, isChanged: _isChanged }: { label: string; cur: React.ReactNode; next?: React.ReactNode; isChanged?: boolean }) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: showOnlyCurrent ? '1.2fr 1fr' : '1.2fr 1fr 1fr', alignItems: 'center', gap: 1, py: 0.75 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
      <Box>{cur}</Box>
      {!showOnlyCurrent && (
        <Box>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            {next}
          </Box>
        </Box>
      )}
    </Box>
  );

  const ValueChip = ({ label, color }: { label: React.ReactNode; color?: 'default' | 'success' | 'warning' | 'info' | 'error' }) => (
    <Chip size="small" variant="outlined" color={color || 'default'} label={label} />
  );

  const LongValue = ({ text, highlight }: { text?: string; highlight?: boolean }) => (
    <Paper
      variant="outlined"
      sx={{ p: 1, backgroundColor: 'grey.50', borderColor: highlight ? 'warning.main' : 'divider' }}
    >
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {str(text)}
      </Typography>
    </Paper>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>{title}</Typography>
      <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: 'grey.50' }}>
        {children}
      </Paper>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 1.5 }}>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>Adjustments Overview</Typography>

  <Section title="Description">
        <Row
          label="Description"
          cur={<LongValue text={(recipe as any).description} />}
          next={<LongValue text={(pendingModifications as any)?.description ?? (recipe as any).description} highlight={descriptionChange} />}
          isChanged={descriptionChange}
        />
      </Section>

      <Section title="Basic Adjustments">
        {/* Unify white balance to Kelvin selection only */}
        <Row label="Contrast" cur={<ValueChip label={fmtNum(current.contrast)} />} next={<ValueChip label={fmtNum(proposed.contrast)} color={hasChange(current.contrast, proposed.contrast) ? 'warning' : 'default'} />} isChanged={hasChange(current.contrast, proposed.contrast)} />
        <Divider sx={{ my: 1 }} />
        <Row label="Vibrance" cur={<ValueChip label={fmtNum(current.vibrance)} />} next={<ValueChip label={fmtNum(proposed.vibrance)} color={hasChange(current.vibrance, proposed.vibrance) ? 'warning' : 'default'} />} isChanged={hasChange(current.vibrance, proposed.vibrance)} />
        <Divider sx={{ my: 1 }} />
        <Row label="Saturation Bias" cur={<ValueChip label={fmtNum(current.saturationBias)} />} next={<ValueChip label={fmtNum(proposed.saturationBias)} color={hasChange(current.saturationBias, proposed.saturationBias) ? 'warning' : 'default'} />} isChanged={hasChange(current.saturationBias, proposed.saturationBias)} />
      </Section>

      <Section title="Style & Options">
        <Divider sx={{ my: 1 }} />
        <Row label="Artist Style" cur={<ValueChip label={str(current.artistStyle?.name)} />} next={<ValueChip label={str(proposed.artistStyle?.name)} color={hasChange(current.artistStyle?.key, proposed.artistStyle?.key) ? 'warning' : 'default'} />} isChanged={hasChange(current.artistStyle?.key, proposed.artistStyle?.key)} />
        <Divider sx={{ my: 1 }} />
        <Row label="Film Style" cur={<ValueChip label={str(current.filmStyle?.name)} />} next={<ValueChip label={str(proposed.filmStyle?.name)} color={hasChange(current.filmStyle?.key, proposed.filmStyle?.key) ? 'warning' : 'default'} />} isChanged={hasChange(current.filmStyle?.key, proposed.filmStyle?.key)} />
      </Section>

      {aiAdjustments && (
        <Section title="Applied Adjustments">
          <Row label="Profile" cur={<ValueChip label={str(aiAdjustments.camera_profile)} />} next={<ValueChip label={str(aiAdjustments.camera_profile)} />} isChanged={false} />
          <Divider sx={{ my: 1 }} />
          <Row label="Treatment" cur={<ValueChip label={str(aiAdjustments.treatment || 'color')} />} next={<ValueChip label={str(aiAdjustments.treatment || 'color')} />} isChanged={false} />
          <Divider sx={{ my: 1 }} />
          <Row label="Exposure" cur={<ValueChip label={fmtNum(aiAdjustments.exposure)} />} next={<ValueChip label={fmtNum(aiAdjustments.exposure)} />} isChanged={false} />
          <Divider sx={{ my: 1 }} />
          <Row label="Contrast" cur={<ValueChip label={fmtNum(aiAdjustments.contrast)} />} next={<ValueChip label={fmtNum(aiAdjustments.contrast)} />} isChanged={false} />
          <Divider sx={{ my: 1 }} />
          <Row label="Vibrance" cur={<ValueChip label={fmtNum(aiAdjustments.vibrance)} />} next={<ValueChip label={fmtNum(aiAdjustments.vibrance)} />} isChanged={false} />
          <Divider sx={{ my: 1 }} />
          <Row label="Saturation" cur={<ValueChip label={fmtNum(aiAdjustments.saturation)} />} next={<ValueChip label={fmtNum(aiAdjustments.saturation)} />} isChanged={false} />
          <Divider sx={{ my: 1 }} />
          <Row label="Highlights" cur={<ValueChip label={fmtNum(aiAdjustments.highlights)} />} next={<ValueChip label={fmtNum(aiAdjustments.highlights)} />} isChanged={false} />
          <Divider sx={{ my: 1 }} />
          <Row label="Shadows" cur={<ValueChip label={fmtNum(aiAdjustments.shadows)} />} next={<ValueChip label={fmtNum(aiAdjustments.shadows)} />} isChanged={false} />
          <Divider sx={{ my: 1 }} />
          <Row label="Whites" cur={<ValueChip label={fmtNum(aiAdjustments.whites)} />} next={<ValueChip label={fmtNum(aiAdjustments.whites)} />} isChanged={false} />
          <Divider sx={{ my: 1 }} />
          <Row label="Blacks" cur={<ValueChip label={fmtNum(aiAdjustments.blacks)} />} next={<ValueChip label={fmtNum(aiAdjustments.blacks)} />} isChanged={false} />
          <Divider sx={{ my: 1 }} />
          <Row
            label="Curves Present"
            cur={<ValueChip label={((((aiAdjustments as any).tone_curve?.length || 0) > 0) || ['red', 'green', 'blue'].some(c => (((aiAdjustments as any)[`tone_curve_${c}`]?.length || 0) > 0)) || ['parametric_shadows', 'parametric_darks', 'parametric_lights', 'parametric_highlights'].some(k => (aiAdjustments as any)[k] !== undefined)) ? 'Yes' : 'No'} />}
            next={<ValueChip label={((((aiAdjustments as any).tone_curve?.length || 0) > 0) || ['red', 'green', 'blue'].some(c => (((aiAdjustments as any)[`tone_curve_${c}`]?.length || 0) > 0)) || ['parametric_shadows', 'parametric_darks', 'parametric_lights', 'parametric_highlights'].some(k => (aiAdjustments as any)[k] !== undefined)) ? 'Yes' : 'No'} />}
            isChanged={false}
          />
          <Divider sx={{ my: 1 }} />
          <Row
            label="Color Grading"
            cur={<ValueChip label={(((aiAdjustments as any).color_grade_global_hue !== undefined) || ((aiAdjustments as any).color_grade_shadow_hue !== undefined)) ? 'Yes' : 'No'} />}
            next={<ValueChip label={(((aiAdjustments as any).color_grade_global_hue !== undefined) || ((aiAdjustments as any).color_grade_shadow_hue !== undefined)) ? 'Yes' : 'No'} />}
            isChanged={false}
          />
          <Divider sx={{ my: 1 }} />
          <Row
            label="HSL Present"
            cur={<ValueChip label={Object.keys(aiAdjustments).some(k => /^(hue|sat|lum)_(red|orange|yellow|green|aqua|blue|purple|magenta)$/.test(k)) ? 'Yes' : 'No'} />}
            next={<ValueChip label={Object.keys(aiAdjustments).some(k => /^(hue|sat|lum)_(red|orange|yellow|green|aqua|blue|purple|magenta)$/.test(k)) ? 'Yes' : 'No'} />}
            isChanged={false}
          />
          <Divider sx={{ my: 1 }} />
          <Row label="Grain Amount" cur={<ValueChip label={fmtNum((aiAdjustments as any).grain_amount)} />} next={<ValueChip label={fmtNum((effectiveAiAdjustments as any).grain_amount)} color={hasChange((aiAdjustments as any).grain_amount, (effectiveAiAdjustments as any).grain_amount) ? 'warning' : 'default'} />} isChanged={hasChange((aiAdjustments as any).grain_amount, (effectiveAiAdjustments as any).grain_amount)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Grain Size" cur={<ValueChip label={fmtNum((aiAdjustments as any).grain_size)} />} next={<ValueChip label={fmtNum((effectiveAiAdjustments as any).grain_size)} color={hasChange((aiAdjustments as any).grain_size, (effectiveAiAdjustments as any).grain_size) ? 'warning' : 'default'} />} isChanged={hasChange((aiAdjustments as any).grain_size, (effectiveAiAdjustments as any).grain_size)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Grain Frequency" cur={<ValueChip label={fmtNum((aiAdjustments as any).grain_frequency)} />} next={<ValueChip label={fmtNum((effectiveAiAdjustments as any).grain_frequency)} color={hasChange((aiAdjustments as any).grain_frequency, (effectiveAiAdjustments as any).grain_frequency) ? 'warning' : 'default'} />} isChanged={hasChange((aiAdjustments as any).grain_frequency, (effectiveAiAdjustments as any).grain_frequency)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Vignette Amount" cur={<ValueChip label={fmtNum((aiAdjustments as any).vignette_amount)} />} next={<ValueChip label={fmtNum((effectiveAiAdjustments as any).vignette_amount)} color={hasChange((aiAdjustments as any).vignette_amount, (effectiveAiAdjustments as any).vignette_amount) ? 'warning' : 'default'} />} isChanged={hasChange((aiAdjustments as any).vignette_amount, (effectiveAiAdjustments as any).vignette_amount)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Vignette Midpoint" cur={<ValueChip label={fmtNum((aiAdjustments as any).vignette_midpoint)} />} next={<ValueChip label={fmtNum((effectiveAiAdjustments as any).vignette_midpoint)} color={hasChange((aiAdjustments as any).vignette_midpoint, (effectiveAiAdjustments as any).vignette_midpoint) ? 'warning' : 'default'} />} isChanged={hasChange((aiAdjustments as any).vignette_midpoint, (effectiveAiAdjustments as any).vignette_midpoint)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Vignette Feather" cur={<ValueChip label={fmtNum((aiAdjustments as any).vignette_feather)} />} next={<ValueChip label={fmtNum((effectiveAiAdjustments as any).vignette_feather)} color={hasChange((aiAdjustments as any).vignette_feather, (effectiveAiAdjustments as any).vignette_feather) ? 'warning' : 'default'} />} isChanged={hasChange((aiAdjustments as any).vignette_feather, (effectiveAiAdjustments as any).vignette_feather)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Vignette Roundness" cur={<ValueChip label={fmtNum((aiAdjustments as any).vignette_roundness)} />} next={<ValueChip label={fmtNum((effectiveAiAdjustments as any).vignette_roundness)} color={hasChange((aiAdjustments as any).vignette_roundness, (effectiveAiAdjustments as any).vignette_roundness) ? 'warning' : 'default'} />} isChanged={hasChange((aiAdjustments as any).vignette_roundness, (effectiveAiAdjustments as any).vignette_roundness)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Vignette Style" cur={<ValueChip label={fmtNum((aiAdjustments as any).vignette_style)} />} next={<ValueChip label={fmtNum((effectiveAiAdjustments as any).vignette_style)} color={hasChange((aiAdjustments as any).vignette_style, (effectiveAiAdjustments as any).vignette_style) ? 'warning' : 'default'} />} isChanged={hasChange((aiAdjustments as any).vignette_style, (effectiveAiAdjustments as any).vignette_style)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Vignette Highlight Contrast" cur={<ValueChip label={fmtNum((aiAdjustments as any).vignette_highlight_contrast)} />} next={<ValueChip label={fmtNum((effectiveAiAdjustments as any).vignette_highlight_contrast)} color={hasChange((aiAdjustments as any).vignette_highlight_contrast, (effectiveAiAdjustments as any).vignette_highlight_contrast) ? 'warning' : 'default'} />} isChanged={hasChange((aiAdjustments as any).vignette_highlight_contrast, (effectiveAiAdjustments as any).vignette_highlight_contrast)} />
          <Divider sx={{ my: 1 }} />
          <Row label="Override Look Vignette" cur={<ValueChip label={(aiAdjustments as any).override_look_vignette ? 'True' : 'False'} />} next={<ValueChip label={(aiAdjustments as any).override_look_vignette ? 'True' : 'False'} />} isChanged={false} />
          <Divider sx={{ my: 1 }} />
          <Row label="Masks" cur={<ValueChip label={`${Array.isArray((aiAdjustments as any).masks) ? (aiAdjustments as any).masks.length : 0}`} />} next={<ValueChip label={`${Array.isArray((aiAdjustments as any).masks) ? (aiAdjustments as any).masks.length : 0}`} />} isChanged={false} />

          {Array.isArray((aiAdjustments as any).masks) && (aiAdjustments as any).masks.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {(aiAdjustments as any).masks.map((m: any, idx: number) => {
                const adj = m?.adjustments || {};
                const adjKeys = Object.keys(adj).filter(k => typeof (adj as any)[k] === 'number');
                const name = m?.name || `Mask ${idx + 1}`;
                const type = m?.type || 'mask';
                return (
                  <Paper key={idx} variant="outlined" sx={{ p: 1, mb: 1, backgroundColor: 'white', overflowX: 'hidden' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" label={name} />
                      <Chip size="small" color="info" label={`Type: ${type}`} />
                      {typeof m.subCategoryId === 'number' && (
                        <Chip size="small" variant="outlined" label={`SubCat: ${m.subCategoryId}`} />
                      )}
                    </Box>
                    {adjKeys.length > 0 && (
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {adjKeys.map(k => (
                          <Chip key={k} size="small" variant="outlined" label={`${k.replace('local_', '')}: ${(adj as any)[k]}`} />
                        ))}
                      </Box>
                    )}
                  </Paper>
                );
              })}
            </Box>
          )}
        </Section>
      )}

      {/* Accepted mask overrides on the recipe (persisted). Hidden in current-only mode to avoid duplication with effective masks. */}
      {!showOnlyCurrent && Array.isArray((recipe as any).maskOverrides) && (recipe as any).maskOverrides.length > 0 && (
        <Section title="Recipe Mask Overrides">
          <Box>
            {(recipe as any).maskOverrides.map((m: any, idx: number) => {
              const adj = m?.adjustments || {};
              const adjKeys = Object.keys(adj).filter(k => typeof (adj as any)[k] === 'number');
              const name = m?.name || `Mask ${idx + 1}`;
              const type = m?.type || 'mask';
              const op = m?.op || 'add';
              return (
                <Paper key={idx} variant="outlined" sx={{ p: 1, mb: 1, backgroundColor: 'white', overflowX: 'hidden' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Chip size="small" color={op === 'remove' ? 'error' : op === 'update' ? 'warning' : 'success'} label={op.toUpperCase()} />
                    <Chip size="small" label={name} />
                    <Chip size="small" color="info" label={`Type: ${type}`} />
                    {typeof m.subCategoryId === 'number' && (
                      <Chip size="small" variant="outlined" label={`SubCat: ${m.subCategoryId}`} />
                    )}
                  </Box>
                  {adjKeys.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                      {adjKeys.map(k => (
                        <Chip key={k} size="small" variant="outlined" label={`${k.replace('local_', '')}: ${(adj as any)[k]}`} />
                      ))}
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>
        </Section>
      )}

      {/* Proposed mask changes from chat (prefer maskOverrides, fallback to masks) */}
      {!showOnlyCurrent && (() => {
        const pm: any = pendingModifications as any;
        const proposed = (pm && (pm.maskOverrides || pm.masks)) as any[] | undefined;
        return Array.isArray(proposed) && proposed.length > 0;
      })() && (
        <Section title="Proposed Masks">
          <Box>
            {(() => {
              const pm: any = pendingModifications as any;
              const proposed = (pm && (pm.maskOverrides || pm.masks)) as any[];
              return proposed.map((m: any, idx: number) => {
                const adj = m?.adjustments || {};
                const adjKeys = Object.keys(adj).filter(k => typeof (adj as any)[k] === 'number');
                const name = m?.name || `Mask ${idx + 1}`;
                const type = m?.type || 'mask';
                const op = m?.op || 'add';
                return (
                  <Paper key={idx} variant="outlined" sx={{ p: 1, mb: 1, backgroundColor: 'white', overflowX: 'hidden' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip size="small" color={op === 'remove' ? 'error' : op === 'update' ? 'warning' : 'success'} label={op.toUpperCase()} />
                      <Chip size="small" label={name} />
                      <Chip size="small" color="info" label={`Type: ${type}`} />
                      {typeof m.subCategoryId === 'number' && (
                        <Chip size="small" variant="outlined" label={`SubCat: ${m.subCategoryId}`} />
                      )}
                    </Box>
                    {adjKeys.length > 0 && (
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                        {adjKeys.map(k => (
                          <Chip key={k} size="small" variant="outlined" label={`${k.replace('local_', '')}: ${(adj as any)[k]}`} />
                        ))}
                      </Box>
                    )}
                  </Paper>
                );
              });
            })()}
          </Box>
        </Section>
      )}
    </Box>
  );
};
