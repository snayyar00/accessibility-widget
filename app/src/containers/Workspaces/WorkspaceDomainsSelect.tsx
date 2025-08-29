import * as React from 'react';
import { Theme, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import Chip from '@mui/material/Chip';
import Checkbox from '@mui/material/Checkbox';
import ListItemText from '@mui/material/ListItemText';
import { Site } from '../../generated/graphql';

const SELECT_CONFIG = {
  ITEM_HEIGHT: 48,
  ITEM_PADDING_TOP: 8,
  MAX_ITEMS: 4.5,
  MENU_WIDTH: 300,
} as const;

const MenuProps = {
  PaperProps: {
    style: {
      maxHeight:
        SELECT_CONFIG.ITEM_HEIGHT * SELECT_CONFIG.MAX_ITEMS +
        SELECT_CONFIG.ITEM_PADDING_TOP,
      width: SELECT_CONFIG.MENU_WIDTH,
    },
  },
};

const getItemStyles = (
  siteId: string,
  selectedSiteIds: readonly string[],
  theme: Theme,
) => ({
  fontWeight: selectedSiteIds.includes(siteId)
    ? theme.typography.fontWeightMedium
    : theme.typography.fontWeightRegular,
});

interface WorkspaceDomainsSelectProps {
  value: string[];
  onChange: (siteIds: string[]) => void;
  disabled?: boolean;
  userSites: Site[];
  loading?: boolean;
}

export default function WorkspaceDomainsSelect({
  value,
  onChange,
  disabled = false,
  userSites,
  loading = false,
}: WorkspaceDomainsSelectProps) {
  const theme = useTheme();

  const siteMap = React.useMemo(
    () => new Map(userSites.map((site: Site) => [String(site.id), site])),
    [userSites],
  );

  const handleChange = React.useCallback(
    (event: SelectChangeEvent<typeof value>) => {
      const newValue = event.target.value;
      const selectedIds =
        typeof newValue === 'string' ? newValue.split(',') : newValue;
      onChange(selectedIds);
    },
    [onChange],
  );

  const renderSelectedChips = React.useCallback(
    (selected: string[]) => (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {selected.map((siteId) => {
          const site = siteMap.get(siteId);
          return (
            <Chip
              key={siteId}
              label={(site as Site)?.url || `Domain ${siteId}`}
              size="small"
            />
          );
        })}
      </Box>
    ),
    [siteMap],
  );

  if (loading) {
    return (
      <FormControl sx={{ width: '100%' }} disabled>
        <InputLabel>Loading domains...</InputLabel>
        <OutlinedInput label="Loading domains..." />
      </FormControl>
    );
  }

  return (
    <FormControl sx={{ width: '100%' }} disabled={disabled}>
      <InputLabel id="workspace-domains-select-label">Domains</InputLabel>
      <Select
        labelId="workspace-domains-select-label"
        id="workspace-domains-select"
        multiple
        value={value}
        onChange={handleChange}
        input={<OutlinedInput id="select-multiple-domains" label="Domains" />}
        renderValue={renderSelectedChips}
        MenuProps={MenuProps}
      >
        {userSites.map((site: Site) => (
          <MenuItem
            key={site.id}
            value={String(site.id)}
            style={getItemStyles(String(site.id), value, theme)}
          >
            <Checkbox checked={value.includes(String(site.id))} />
            <ListItemText primary={site.url} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
