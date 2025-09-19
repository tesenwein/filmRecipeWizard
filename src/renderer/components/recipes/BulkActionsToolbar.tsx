import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Box, Button, Toolbar, Typography } from '@mui/material';
import React from 'react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeleteSelected: () => void;
}

const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({ selectedCount, totalCount, onSelectAll, onDeleteSelected }) => {
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

