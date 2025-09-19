import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAlert } from '../context/AlertContext';

interface XMPImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: { filePath?: string; fileContent?: string; title?: string; description?: string }) => Promise<void>;
}

const XMPImportDialog: React.FC<XMPImportDialogProps> = ({ open, onClose, onImport }) => {
  const [filePath, setFilePath] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const { showError } = useAlert();

  const handleFileSelect = async () => {
    try {
      const files = await window.electronAPI.selectFiles({
        title: 'Select XMP Preset File',
        filters: [
          { name: 'XMP Files', extensions: ['xmp'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (files && files.length > 0) {
        const selectedFile = files[0];
        setFilePath(selectedFile);

        // Read file content
        const content = await window.electronAPI.readFile(selectedFile);
        setFileContent(content);

        // Auto-fill title from filename
        const fileName = selectedFile.split('/').pop() || '';
        const nameWithoutExt = fileName.replace(/\.xmp$/i, '');
        setTitle(nameWithoutExt);
      }
    } catch {
      showError('Failed to select file');
    }
  };

  const handleImport = async () => {
    if (!filePath && !fileContent) {
      showError('Please select an XMP file');
      return;
    }

    if (!title.trim()) {
      showError('Please enter a title for the recipe');
      return;
    }

    setIsImporting(true);
    try {
      await onImport({
        filePath: filePath || undefined,
        fileContent: fileContent || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
      });
      handleClose();
    } catch {
      showError('Failed to import XMP preset');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFilePath('');
    setFileContent('');
    setTitle('');
    setDescription('');
    setIsImporting(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUploadIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>
            Import XMP Preset
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* File Selection */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              XMP File
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
              onClick={handleFileSelect}
            >
              <Box>
                {filePath ? (
                  <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                    {filePath.split('/').pop()}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Click to select XMP file
                  </Typography>
                )}
              </Box>
              <CloudUploadIcon color="primary" />
            </Paper>
          </Box>

          {/* Title Input */}
          <TextField
            label="Recipe Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
            placeholder="Enter a name for this recipe"
            helperText="This will be the name of the imported recipe"
          />

          {/* Description Input */}
          <TextField
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            placeholder="Enter a description for this recipe"
            helperText="Optional description to help identify this recipe"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} disabled={isImporting}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={isImporting || !filePath || !title.trim()}
          sx={{ minWidth: 100 }}
        >
          {isImporting ? 'Importing...' : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default XMPImportDialog;
