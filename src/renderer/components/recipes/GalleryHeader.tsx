import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DownloadIcon from '@mui/icons-material/Download';
import { Box, Button, FormControl, IconButton, InputAdornment, InputLabel, Menu, MenuItem, Select, Stack, TextField, ListItemIcon, ListItemText } from '@mui/material';
import React from 'react';

type SortBy = 'newest' | 'oldest' | 'name';

interface GalleryHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: SortBy;
  onSortChange: (value: SortBy) => void;
  selectionMode: boolean;
  onToggleSelectionMode: () => void;
  onNewProcess: () => void;
  onImportRecipes: () => void;
  onOpenXMPImport: () => void;
  onExportAll: () => void;
  exportAllDisabled?: boolean;
}

const GalleryHeader: React.FC<GalleryHeaderProps> = ({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  selectionMode,
  onToggleSelectionMode,
  onNewProcess,
  onImportRecipes,
  onOpenXMPImport,
  onExportAll,
  exportAllDisabled,
}) => {
  const [actionsMenuAnchor, setActionsMenuAnchor] = React.useState<null | HTMLElement>(null);

  const handleActionsMenuOpen = (event: React.MouseEvent<HTMLElement>) => setActionsMenuAnchor(event.currentTarget);
  const handleActionsMenuClose = () => setActionsMenuAnchor(null);

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{
        backgroundColor: 'background.paper',
        borderRadius: 2,
        p: 2.5,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Search and Sort Section */}
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flex: { sm: '1 1 auto' } }}>
        <TextField
          size="small"
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200, flex: '1 1 200px' }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sortBy}
            label="Sort by"
            onChange={(e) => onSortChange(e.target.value as SortBy)}
            MenuProps={{
              transitionDuration: 0,
              disableAutoFocusItem: true,
            }}
          >
            <MenuItem value="name">Name</MenuItem>
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="oldest">Oldest</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Divider */}
      <Box sx={{ width: '1px', height: '50px', backgroundColor: 'divider', opacity: 0.5, mx: 1 }} />

      {/* Action Buttons Section */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button
          variant={selectionMode ? 'contained' : 'outlined'}
          size="small"
          onClick={onToggleSelectionMode}
        >
          {selectionMode ? 'Cancel' : 'Select'}
        </Button>
        <Button variant="contained" size="small" onClick={onNewProcess}>
          New Recipe
        </Button>
      </Box>

      {/* Three Dots Menu - Far Right */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <IconButton
          size="small"
          onClick={handleActionsMenuOpen}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': { backgroundColor: 'action.hover' },
          }}
          aria-label="More actions"
        >
          <MoreVertIcon />
        </IconButton>
      </Box>

      {/* Actions Menu */}
      <Menu
        anchorEl={actionsMenuAnchor}
        open={Boolean(actionsMenuAnchor)}
        onClose={handleActionsMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        transitionDuration={0}
      >
        <MenuItem onClick={() => { handleActionsMenuClose(); onImportRecipes(); }}>
          <ListItemIcon><FileUploadIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Import Recipes</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleActionsMenuClose(); onOpenXMPImport(); }}>
          <ListItemIcon><UploadFileIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Import XMP Preset</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleActionsMenuClose(); onExportAll(); }} disabled={!!exportAllDisabled}>
          <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Export All</ListItemText>
        </MenuItem>
      </Menu>
    </Stack>
  );
};

export default GalleryHeader;

