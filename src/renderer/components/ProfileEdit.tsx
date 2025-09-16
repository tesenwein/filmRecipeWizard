import { Stack, TextField } from '@mui/material';
import React, { useEffect, useState } from 'react';

export interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  website: string;
  instagram: string;
}

export interface ProfileEditProps {
  initialData?: Partial<ProfileData>;
  onChange?: (data: ProfileData & { isValid: boolean }) => void;
  layout?: 'stack' | 'grid';
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ initialData = {}, onChange, layout = 'stack' }) => {
  const [firstName, setFirstName] = useState(initialData.firstName || '');
  const [lastName, setLastName] = useState(initialData.lastName || '');
  const [email, setEmail] = useState(initialData.email || '');
  const [website, setWebsite] = useState(initialData.website || '');
  const [instagram, setInstagram] = useState(initialData.instagram || '');
  
  const [emailError, setEmailError] = useState('');
  const [websiteError, setWebsiteError] = useState('');
  const [instagramError, setInstagramError] = useState('');

  const isValidEmail = (value: string) =>
    !value || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

  const normalizeUrl = (value: string): string | null => {
    if (!value) return '';
    const v = value.trim();
    const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      return new URL(withScheme).toString();
    } catch {
      return null;
    }
  };

  const normalizeInstagram = (value: string): { ok: boolean; handle?: string; url?: string } => {
    const v = value.trim();
    if (!v) return { ok: true };
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      if (/instagram\.com$/i.test(u.hostname)) {
        const h = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean)[0] || '';
        if (/^[A-Za-z0-9._]{1,30}$/.test(h))
          return { ok: true, handle: `@${h}`, url: `https://www.instagram.com/${h}` };
      }
    } catch {
      // Ignore URL parsing errors
    }
    if (!v.startsWith('@')) return { ok: false };
    const handle = v.replace(/^@/, '');
    if (/^[A-Za-z0-9._]{1,30}$/.test(handle))
      return { ok: true, handle: `@${handle}`, url: `https://www.instagram.com/${handle}` };
    return { ok: false };
  };

  useEffect(() => {
    if (onChange) {
      const isEmailValid = isValidEmail(email);
      const normalizedWebsite = normalizeUrl(website);
      const instagramResult = normalizeInstagram(instagram);
      
      const isValid = isEmailValid && normalizedWebsite !== null && instagramResult.ok;
      
      onChange({
        firstName,
        lastName,
        email,
        website,
        instagram,
        isValid
      });
    }
  }, [firstName, lastName, email, website, instagram, onChange]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailError(isValidEmail(value) ? '' : 'Enter a valid email');
  };

  const handleWebsiteChange = (value: string) => {
    setWebsite(value);
    const normalized = normalizeUrl(value);
    setWebsiteError(normalized === null ? 'Enter a valid URL' : '');
  };

  const handleInstagramChange = (value: string) => {
    setInstagram(value);
    const result = normalizeInstagram(value);
    setInstagramError(result.ok ? '' : 'Enter a valid handle or Instagram URL');
  };

  if (layout === 'grid') {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <TextField
            label="First Name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
          />
          <TextField
            label="Last Name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={e => handleEmailChange(e.target.value)}
            error={!!emailError}
            helperText={emailError || 'Optional'}
          />
          <TextField
            label="Website"
            value={website}
            onChange={e => handleWebsiteChange(e.target.value)}
            error={!!websiteError}
            helperText={websiteError || 'https://example.com'}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <TextField
            fullWidth
            label="Instagram"
            placeholder="@yourhandle (required) or instagram.com/yourhandle"
            value={instagram}
            onChange={e => handleInstagramChange(e.target.value)}
            error={!!instagramError}
            helperText={instagramError || 'Optional'}
          />
        </div>
      </div>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          fullWidth
          label="First Name"
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
        />
        <TextField
          fullWidth
          label="Last Name"
          value={lastName}
          onChange={e => setLastName(e.target.value)}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={e => handleEmailChange(e.target.value)}
          error={!!emailError}
          helperText={emailError || 'Optional'}
        />
        <TextField
          fullWidth
          label="Website"
          value={website}
          onChange={e => handleWebsiteChange(e.target.value)}
          error={!!websiteError}
          helperText={websiteError || 'https://example.com'}
        />
      </Stack>
      <TextField
        fullWidth
        label="Instagram"
        placeholder="@yourhandle (required) or instagram.com/yourhandle"
        value={instagram}
        onChange={e => handleInstagramChange(e.target.value)}
        error={!!instagramError}
        helperText={instagramError || 'Optional'}
      />
    </Stack>
  );
};

export default ProfileEdit;