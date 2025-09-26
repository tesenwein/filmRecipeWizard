import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadIcon from '@mui/icons-material/Download';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import React from 'react';

interface RecipeContextMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onExport: () => void;
  onSaveToLightroom: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  lightroomPathConfigured?: boolean;
}

const RecipeContextMenu: React.FC<RecipeContextMenuProps> = ({ anchorEl, open, onClose, onExport, onSaveToLightroom, onDuplicate, onDelete, lightroomPathConfigured = false }) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      transitionDuration={0}
    >
      <MenuItem onClick={onExport}>
        <ListItemIcon>
          <DownloadIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Export Recipe</ListItemText>
      </MenuItem>
      {lightroomPathConfigured ? (
        <MenuItem onClick={onSaveToLightroom}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Save to Lightroom</ListItemText>
        </MenuItem>
      ) : (
        <MenuItem disabled>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Save to Lightroom</ListItemText>
        </MenuItem>
      )}
      <MenuItem onClick={onDuplicate}>
        <ListItemIcon>
          <FileCopyIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Duplicate</ListItemText>
      </MenuItem>
      <MenuItem onClick={onDelete} sx={{ color: 'error.main' }}>
        <ListItemIcon>
          <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
        </ListItemIcon>
        <ListItemText>Delete</ListItemText>
      </MenuItem>
    </Menu>
  );
};

export default RecipeContextMenu;

