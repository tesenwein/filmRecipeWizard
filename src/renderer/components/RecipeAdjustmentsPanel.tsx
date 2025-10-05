import { Box, Chip, Divider, Paper, Typography } from '@mui/material';
import React from 'react';
import type { AIColorAdjustments } from '../../services/types';
import { Recipe, StyleOptions } from '../../shared/types';

type Maybe<T> = T | undefined | null;

export interface RecipeAdjustmentsPanelProps {
  recipe: Recipe;
  aiAdjustments?: AIColorAdjustments | null;
  showOnlyCurrent?: boolean;
}

function fmtNum(v: any): string {
  if (v === undefined || v === null) return 'Not set';
  if (Number.isNaN(Number(v))) return 'Invalid';
  const n = Number(v);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1);
}


function str(v: Maybe<string>): string {
  const s = (v ?? '').toString().trim();
  return s.length ? s : '—';
}

export const RecipeAdjustmentsPanel: React.FC<RecipeAdjustmentsPanelProps> = ({ recipe, aiAdjustments }) => {
  const current = (recipe.userOptions || {}) as StyleOptions;

  const Row = ({ label, cur }: { label: string; cur: React.ReactNode }) => (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', alignItems: 'center', gap: 1, py: 0.75 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
      <Box>{cur}</Box>
    </Box>
  );

  const ValueChip = ({ label }: { label: React.ReactNode }) => (
    <Chip size="small" variant="outlined" label={label} />
  );

  const LongValue = ({ text }: { text?: string }) => (
    <Paper
      variant="outlined"
      sx={{ p: 1, backgroundColor: 'grey.50' }}
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
      <Section title="Description">
        <Row
          label="Description"
          cur={<LongValue text={(recipe as any).description} />}
        />
      </Section>

      {aiAdjustments && (
        <Section title="Tone Adjustments">
          <Row label="Contrast" cur={<ValueChip label={fmtNum(aiAdjustments?.contrast)} />} />
          <Divider sx={{ my: 1 }} />
          <Row label="Highlights" cur={<ValueChip label={fmtNum(aiAdjustments?.highlights)} />} />
          <Divider sx={{ my: 1 }} />
          <Row label="Shadows" cur={<ValueChip label={fmtNum(aiAdjustments?.shadows)} />} />
          <Divider sx={{ my: 1 }} />
          <Row label="Whites" cur={<ValueChip label={fmtNum(aiAdjustments?.whites)} />} />
          <Divider sx={{ my: 1 }} />
          <Row label="Blacks" cur={<ValueChip label={fmtNum(aiAdjustments?.blacks)} />} />
        </Section>
      )}

      {aiAdjustments && (
        <Section title="Color Adjustments">
          <Row label="Vibrance" cur={<ValueChip label={fmtNum(aiAdjustments?.vibrance)} />} />
          <Divider sx={{ my: 1 }} />
          <Row label="Saturation" cur={<ValueChip label={fmtNum(aiAdjustments?.saturation)} />} />
        </Section>
      )}

      <Section title="Style & Options">
        <Row label="Artist Style"
          cur={
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <ValueChip label={str(current.artistStyle?.name)} />
              <Chip
                label={current.artistStyle?.colorType === 'monochrome' ? 'B&W' : 'Color'}
                variant="outlined"
                color={current.artistStyle?.colorType === 'monochrome' ? 'secondary' : 'primary'}
                size="small"
              />
            </Box>
          }
        />
        <Divider sx={{ my: 1 }} />
        <Row label="Film Style" cur={<ValueChip label={str(current.filmStyle?.name)} />} />
      </Section>

      {aiAdjustments && (
        <Section title="Camera Profile">
          <Row label="Profile" cur={<ValueChip label={str(aiAdjustments.camera_profile)} />} />
          <Divider sx={{ my: 1 }} />
          <Row label="Treatment" cur={<ValueChip label={str(aiAdjustments.treatment || 'color')} />} />
        </Section>
      )}

      {aiAdjustments && (
        <Section title="Advanced Features">
          <Row
            label="Curves Present"
            cur={<ValueChip label={((((aiAdjustments as any).tone_curve?.length || 0) > 0) || ['red', 'green', 'blue'].some(c => (((aiAdjustments as any)[`tone_curve_${c}`]?.length || 0) > 0)) || ['parametric_shadows', 'parametric_darks', 'parametric_lights', 'parametric_highlights'].some(k => (aiAdjustments as any)[k] !== undefined)) ? 'Yes' : 'No'} />}
          />
          <Divider sx={{ my: 1 }} />
          <Row
            label="Color Grading"
            cur={<ValueChip label={(((aiAdjustments as any).color_grade_global_hue !== undefined) || ((aiAdjustments as any).color_grade_shadow_hue !== undefined)) ? 'Yes' : 'No'} />}
          />
          <Divider sx={{ my: 1 }} />
          <Row
            label="HSL Present"
            cur={<ValueChip label={Object.keys(aiAdjustments).some(k => /^(hue|sat|lum)_(red|orange|yellow|green|aqua|blue|purple|magenta)$/.test(k)) ? 'Yes' : 'No'} />}
          />
        </Section>
      )}

      {aiAdjustments && (
        <Section title="Film Grain">
          <Row label="Grain Amount" cur={<ValueChip label={fmtNum((aiAdjustments as any).grain_amount)} />} />
          <Divider sx={{ my: 1 }} />
          <Row label="Grain Size" cur={<ValueChip label={fmtNum((aiAdjustments as any).grain_size)} />} />
          <Divider sx={{ my: 1 }} />
          <Row label="Grain Frequency" cur={<ValueChip label={fmtNum((aiAdjustments as any).grain_frequency)} />} />
        </Section>
      )}

      {aiAdjustments && (
        <Section title="Vignette">
          <Row label="Vignette Amount" cur={<ValueChip label={fmtNum((aiAdjustments as any).vignette_amount)} />} />
          <Divider sx={{ my: 1 }} />
          <Row label="Vignette Midpoint" cur={<ValueChip label={fmtNum((aiAdjustments as any).vignette_midpoint)} />} />
          <Divider sx={{ my: 1 }} />
          <Row label="Vignette Feather" cur={<ValueChip label={fmtNum((aiAdjustments as any).vignette_feather)} />} />
          <Divider sx={{ my: 1 }} />
          <Row label="Vignette Roundness" cur={<ValueChip label={fmtNum((aiAdjustments as any).vignette_roundness)} />} />
          <Divider sx={{ my: 1 }} />
          <Row label="Vignette Style" cur={<ValueChip label={fmtNum((aiAdjustments as any).vignette_style)} />} />
          <Divider sx={{ my: 1 }} />
          <Row label="Vignette Highlight Contrast" cur={<ValueChip label={fmtNum((aiAdjustments as any).vignette_highlight_contrast)} />} />
        </Section>
      )}

      {aiAdjustments && (
        <Section title="Local Adjustments">
          <Row label="Masks" cur={<ValueChip label={`${Array.isArray((aiAdjustments as any).masks) ? (aiAdjustments as any).masks.length : 0}`} />} />

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
    </Box>
  );
};
