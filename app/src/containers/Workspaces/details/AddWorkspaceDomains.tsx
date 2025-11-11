import * as React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  TextField,
  Chip,
} from '@mui/material';
import { useMutation, useQuery } from '@apollo/client';
import ADD_WORKSPACE_DOMAINS from '@/queries/workspace/addWorkspaceDomains';
import GET_AVAILABLE_SITES_FOR_WORKSPACE from '@/queries/sites/getAvailableSitesForWorkspace';
import { toast } from 'sonner';import { Query } from '@/generated/graphql';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';

type AddWorkspaceDomainsProps = {
  workspaceId: number;
  currentDomainIds: number[];
  onDomainsAdded?: () => void;
  onCancel: () => void;
};

export const AddWorkspaceDomains: React.FC<AddWorkspaceDomainsProps> = ({
  workspaceId,
  currentDomainIds,
  onDomainsAdded,
  onCancel,
}) => {
  const { data: userData } = useSelector((state: RootState) => state.user);

  const [open, setOpen] = React.useState(true);
  const [selectedSiteIds, setSelectedSiteIds] = React.useState<number[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: sitesData, loading: sitesLoading } = useQuery<Query>(
    GET_AVAILABLE_SITES_FOR_WORKSPACE,
  );

  const [addWorkspaceDomains, { loading: mutationLoading }] = useMutation(
    ADD_WORKSPACE_DOMAINS,
  );

  const allSites = sitesData?.getAvailableSitesForWorkspace || [];

  const availableSites = allSites.filter(
    (site): site is NonNullable<typeof site> =>
      site != null &&
      site.id != null &&
      !currentDomainIds.includes(Number(site.id)),
  );

  const filteredSites = React.useMemo(() => {
    let sites = availableSites;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      sites = sites.filter((site) => site.url?.toLowerCase().includes(query));
    }

    return sites.sort((a, b) => {
      if (a.is_owner === b.is_owner) return 0;
      return a.is_owner ? -1 : 1;
    });
  }, [availableSites, searchQuery]);

  const handleClose = () => {
    setOpen(false);
    onCancel();
  };

  const handleToggleSite = (siteId: number) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId)
        ? prev.filter((id) => id !== siteId)
        : [...prev, siteId],
    );
  };

  const handleSelectAll = () => {
    if (selectedSiteIds.length === filteredSites.length) {
      setSelectedSiteIds([]);
    } else {
      setSelectedSiteIds(filteredSites.map((site) => Number(site.id)));
    }
  };

  const handleAdd = async () => {
    if (selectedSiteIds.length === 0) {
      toast.warning('Please select at least one domain to add.');
      return;
    }

    try {
      const { errors, data } = await addWorkspaceDomains({
        variables: {
          workspaceId: workspaceId.toString(),
          siteIds: selectedSiteIds.map((id) => id.toString()),
        },
      });

      if (errors?.length) {
        errors.forEach((err) =>
          toast.error(err.message || 'Failed to add domains.'),
        );
        return;
      }

      if (!data || !data.addWorkspaceDomains) {
        toast.error('Failed to add domains.');
        return;
      }

      toast.success(
        `${selectedSiteIds.length} ${
          selectedSiteIds.length === 1 ? 'domain' : 'domains'
        } added successfully!`,
      );

      handleClose();
      onDomainsAdded?.();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add domains.');
    }
  };

  const isAllSelected =
    filteredSites.length > 0 && selectedSiteIds.length === filteredSites.length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Domains to Workspace</DialogTitle>

      <DialogContent>
        {sitesLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '200px',
            }}
          >
            <CircularProgress />
          </Box>
        ) : availableSites.length === 0 ? (
          <Box sx={{ py: 3 }}>
            <Typography>No available domains to add.</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 2, mt: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search domains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Box>

            {filteredSites.length === 0 ? (
              <Box sx={{ py: 2 }}>
                <Typography variant="body2">
                  No domains found matching "{searchQuery}"
                </Typography>
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                    pb: 1,
                    px: 1.3,
                    borderBottom: '1px solid #e0e0e0',
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isAllSelected}
                        indeterminate={
                          selectedSiteIds.length > 0 && !isAllSelected
                        }
                        onChange={handleSelectAll}
                      />
                    }
                    label={
                      <Typography variant="body2" fontWeight={500}>
                        Select All ({filteredSites.length})
                      </Typography>
                    }
                  />
                  <Typography variant="caption" color="text.secondary">
                    {selectedSiteIds.length} selected
                  </Typography>
                </Box>

                <Box
                  sx={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    '& .MuiFormControlLabel-root': {
                      width: '100%',
                      mx: 0,
                      py: 0.2,
                      pr: 1,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                    },
                    '& .MuiFormControlLabel-label': {
                      width: '100%',
                      minWidth: 0,
                      overflow: 'hidden',
                    },
                  }}
                >
                  {filteredSites.map((site) => (
                    <FormControlLabel
                      key={site.id}
                      control={
                        <Checkbox
                          checked={selectedSiteIds.includes(Number(site.id))}
                          onChange={() => handleToggleSite(Number(site.id))}
                        />
                      }
                      label={
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              minWidth: 0,
                              flex: 'none',
                            }}
                          >
                            {site.url}
                          </Typography>

                          <Box
                            sx={{
                              display: 'flex',
                              gap: 0.5,
                              ml: 2,
                              minWidth: 0,
                            }}
                          >
                            {userData.isAdminOrOwnerOrSuper &&
                              site.is_owner && (
                                <Chip
                                  variant="outlined"
                                  color="success"
                                  size="small"
                                  label="Owner"
                                />
                              )}

                            {!site.is_owner && site.user_email && (
                              <Chip
                                variant="outlined"
                                color="info"
                                size="small"
                                label={site.user_email}
                              />
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  ))}
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          color="primary"
          variant="outlined"
          size="large"
          onClick={handleClose}
          disabled={mutationLoading}
        >
          Cancel
        </Button>

        <Button
          color="primary"
          variant="contained"
          disableElevation
          size="large"
          onClick={handleAdd}
          disabled={
            mutationLoading || selectedSiteIds.length === 0 || sitesLoading
          }
        >
          {`Add ${
            selectedSiteIds.length > 0 ? `(${selectedSiteIds.length})` : ''
          }`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
