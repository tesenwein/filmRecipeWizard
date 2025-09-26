import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import { Box, Button, FormControl, ListItemIcon, ListItemText, MenuItem, Select, Toolbar, Typography } from '@mui/material';
import React from 'react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
  onExportPresets: () => void;
  onExportProfiles: () => void;
  onSavePresetsToLightroom: () => void;
  onSaveProfilesToLightroom: () => void;
  lightroomPathConfigured?: boolean;
}

const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({ 
  selectedCount, 
  totalCount, 
  onSelectAll, 
  onDeleteSelected, 
  onExportPresets, 
  onExportProfiles,
  onSavePresetsToLightroom,
  onSaveProfilesToLightroom,
  lightroomPathConfigured = false 
}) => {
  console.log('BulkActionsToolbar: lightroomPathConfigured:', lightroomPathConfigured);
  console.log('BulkActionsToolbar: selectedCount:', selectedCount);
  return (
    <Toolbar
      sx={{
        backgroundColor: 'primary.main',
        color: 'primary.contrastText',
        borderRadius: 1,
        mb: 2,
        minHeight: '48px !important',
        px: 3,
        py: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
          {selectedCount > 0
            ? `${selectedCount} recipe${selectedCount !== 1 ? 's' : ''} selected`
            : 'Select recipes to perform bulk actions'
          }
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={onSelectAll}
          sx={{
            color: 'primary.contrastText',
            borderColor: 'primary.contrastText',
            '&:hover': {
              borderColor: 'primary.contrastText',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          {selectedCount === totalCount ? 'Deselect All' : 'Select All'}
        </Button>
        
        <FormControl size="small" sx={{ minWidth: 200}}>
          <Select
            value=""
            displayEmpty
            disabled={selectedCount === 0}
            onChange={(e) => {
              const value = e.target.value as string;
              console.log('BulkActionsToolbar: onChange called with value:', value);
              if (value === 'export-presets') {
                console.log('Calling onExportPresets');
                onExportPresets();
              } else if (value === 'export-profiles') {
                console.log('Calling onExportProfiles');
                onExportProfiles();
              } else if (value === 'save-presets') {
                console.log('Calling onSavePresetsToLightroom');
                onSavePresetsToLightroom();
              } else if (value === 'save-profiles') {
                console.log('Calling onSaveProfilesToLightroom');
                onSaveProfilesToLightroom();
              }
              // Reset the select value after action
              e.target.value = '';
            }}
            sx={{
              color: 'primary.contrastText',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.5)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.contrastText',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.contrastText',
              },
              '& .MuiSelect-select': {
                color: 'primary.contrastText',
                py: 1.5,
                px: 2
              },
              '& .MuiSvgIcon-root': {
                color: 'primary.contrastText',
              }
            }}
            MenuProps={{
              transitionDuration: 0,
              disableAutoFocusItem: true,
            }}
          >
            <MenuItem value="" disabled>
              <em>Export Selected</em>
            </MenuItem>
            <MenuItem value="export-presets">
              <ListItemIcon>
                <DownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Export as Presets</ListItemText>
            </MenuItem>
            <MenuItem value="export-profiles">
              <ListItemIcon>
                <DownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Export as Profiles</ListItemText>
            </MenuItem>
            <MenuItem value="save-presets">
              <ListItemIcon>
                <SaveIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Save Presets to Lightroom</ListItemText>
            </MenuItem>
            <MenuItem value="save-profiles">
              <ListItemIcon>
                <SaveIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Save Profiles to Lightroom</ListItemText>
            </MenuItem>
          </Select>
        </FormControl>
        
        <Button
          variant="contained"
          size="small"
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
          sx={{
            backgroundColor: selectedCount > 0 ? 'error.main' : 'rgba(255, 255, 255, 0.3)',
            '&:hover': {
              backgroundColor: selectedCount > 0 ? 'error.dark' : 'rgba(255, 255, 255, 0.3)'
            },
            '&.Mui-disabled': {
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              color: 'rgba(255, 255, 255, 0.6)',
            }
          }}
          startIcon={<DeleteOutlineIcon />}
        >
          Delete Selected
        </Button>
      </Box>
    </Toolbar>
  );
};

export default BulkActionsToolbar;

