import BugReportIcon from '@mui/icons-material/BugReport';
import GitHubIcon from '@mui/icons-material/Code';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import { IconButton, Tooltip } from '@mui/material';
import React from 'react';
import IconSvg from '../../../assets/icons/icon.svg';

interface AppHeaderProps {
  onNavigate: (path: string) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onNavigate }) => {
  return (
    <header style={{ position: 'sticky', top: 8, zIndex: 50, marginBottom: '16px' }}>
      <div className="drag-region" />
      <div
        style={{
          WebkitAppRegion: 'drag',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.3)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: 2,
          padding: '12px 16px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={IconSvg} alt="Film Recipe Wizard" style={{ width: 28, height: 28 }} />
          <span style={{ fontSize: 20, fontWeight: 800, color: '#1F2937' }}>
            Film Recipe Wizard
          </span>
        </div>
        <div className="no-drag">
          <Tooltip title="Home">
            <IconButton
              color="inherit"
              size="small"
              onClick={() => onNavigate('/gallery')}
              sx={{
                mr: 1,
                color: 'action.active',
                '&:hover': { backgroundColor: 'rgba(17,24,39,0.1)' },
              }}
            >
              <HomeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="GitHub Repository">
            <IconButton
              color="inherit"
              size="small"
              onClick={() =>
                window.electronAPI.openExternal('https://github.com/tesenwein/filmRecipeWizard')
              }
              sx={{
                mr: 1,
                color: 'action.active',
                '&:hover': { backgroundColor: 'rgba(17,24,39,0.1)' },
              }}
            >
              <GitHubIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Report Issues">
            <IconButton
              color="inherit"
              size="small"
              onClick={() =>
                window.electronAPI.openExternal(
                  'https://github.com/tesenwein/filmRecipeWizard/issues'
                )
              }
              sx={{
                mr: 1,
                color: 'action.active',
                '&:hover': { backgroundColor: 'rgba(17,24,39,0.1)' },
              }}
            >
              <BugReportIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton
              color="inherit"
              size="small"
              onClick={() => onNavigate('/settings')}
              sx={{ color: 'action.active', '&:hover': { backgroundColor: 'rgba(17,24,39,0.1)' } }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;