import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material';
import React from 'react';

interface ErrorDialogProps {
  open: boolean;
  title?: string;
  message: string;
  details?: string;
  onClose: () => void;
}

const ErrorDialog: React.FC<ErrorDialogProps> = ({
  open,
  title = 'Error',
  message,
  details,
  onClose,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: details ? 2 : 0 }}>
          {message}
        </DialogContentText>
        {details && (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Details:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                backgroundColor: 'grey.100',
                p: 1.5,
                borderRadius: 1,
                fontSize: '0.875rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {details}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ErrorDialog;