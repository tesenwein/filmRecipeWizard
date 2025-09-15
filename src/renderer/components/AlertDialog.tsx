import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import React from 'react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
}

const getIconForType = (type: AlertType) => {
  switch (type) {
    case 'success':
      return <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />;
    case 'error':
      return <ErrorIcon sx={{ color: 'error.main', mr: 1 }} />;
    case 'warning':
      return <WarningIcon sx={{ color: 'warning.main', mr: 1 }} />;
    case 'info':
    default:
      return <InfoIcon sx={{ color: 'info.main', mr: 1 }} />;
  }
};

const getDefaultTitle = (type: AlertType) => {
  switch (type) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Error';
    case 'warning':
      return 'Warning';
    case 'info':
    default:
      return 'Information';
  }
};

const AlertDialog: React.FC<AlertDialogProps> = ({
  open,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
}) => {
  const displayTitle = title || getDefaultTitle(type);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 2 }}>
        {getIconForType(type)}
        {displayTitle}
      </DialogTitle>
      <DialogContent sx={{ pt: 1, pb: 3 }}>
        <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose} variant="contained" sx={{ minWidth: 80 }}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertDialog;