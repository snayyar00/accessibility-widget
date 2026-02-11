import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useLazyQuery, useQuery } from '@apollo/client';
import {
  TextField,
  Button,
  Grid,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { toast } from 'sonner';import { getErrorMessage } from '@/helpers/error.helper';

import EDIT_ORGANIZATION from '@/queries/organization/editOrganization';
import UPLOAD_ORGANIZATION_LOGO from '@/queries/organization/uploadOrganizationLogo';
import UPLOAD_ORGANIZATION_FAVICON from '@/queries/organization/uploadOrganizationFavicon';
import GET_PROFILE from '@/queries/auth/getProfile';
import GET_ORGANIZATION_SMTP_SETTINGS from '@/queries/organization/getOrganizationSmtpSettings';
import { setProfileUser } from '@/features/auth/user';
import FileUploader, { IFile } from '@/components/Common/Input/FileUploader';
import { Organization } from '@/generated/graphql';
import { RootState } from '@/config/store';

/** Organization with optional SMTP fields (from API; run `npm run codegen` to sync types) */
type OrganizationWithSmtp = Organization & {
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_secure?: boolean | null;
  smtp_user?: string | null;
};

interface OrganizationFormData {
  name: string;
  domain: string;
  toggle_referral_program?: boolean;
}

interface SettingsProps {
  organization: OrganizationWithSmtp;
  isOwner?: boolean;
}

interface SmtpFormData {
  smtp_host: string;
  smtp_port: number | undefined;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
}

const Settings: React.FC<SettingsProps> = ({ organization, isOwner: isOrgOwner }) => {
  const dispatch = useDispatch();

  const { data: userData } = useSelector((state: RootState) => state.user);
  const [logoFiles, setLogoFiles] = useState<IFile[]>([]);
  const [faviconFiles, setFaviconFiles] = useState<IFile[]>([]);

  const [editOrganization, { loading: saving }] =
    useMutation(EDIT_ORGANIZATION);

  const [uploadLogo, { loading: uploadingLogo }] = useMutation(
    UPLOAD_ORGANIZATION_LOGO,
  );
  const [uploadFavicon, { loading: uploadingFavicon }] = useMutation(
    UPLOAD_ORGANIZATION_FAVICON,
  );

  const [getProfile, { loading: profileLoading }] = useLazyQuery(GET_PROFILE);

  const {
    data: smtpSettingsData,
    loading: smtpSettingsLoading,
    refetch: refetchSmtpSettings,
  } = useQuery(GET_ORGANIZATION_SMTP_SETTINGS, {
    variables: { organizationId: organization?.id ?? '' },
    skip: !organization?.id,
    fetchPolicy: 'cache-and-network',
  });

  const smtpSettings = smtpSettingsData?.organizationSmtpSettings ?? null;

  const updateProfile = useCallback(async () => {
    const profileResult = await getProfile();
    const profileUser = profileResult?.data?.profileUser;

    if (profileUser) {
      dispatch(
        setProfileUser({
          data: profileUser,
          loading: profileLoading,
        }),
      );

      return profileUser.currentOrganization;
    }

    return null;
  }, [getProfile, dispatch, profileLoading]);

  const handleLogoChange = async (files: IFile[]) => {
    setLogoFiles(files);

    // Handle file upload
    if (files.length > 0 && files[0].file) {
      try {
        const res = await uploadLogo({
          variables: {
            organizationId: organization.id,
            logo: files[0].file,
          },
        });

        const hasError = res?.errors && res.errors.length;

        if (hasError) {
          const msg = res.errors?.[0]?.message || 'Failed to upload logo.';
          toast.error(msg);
        }

        const updatedOrg = await updateProfile();

        if (updatedOrg?.logo_url) {
          setLogoFiles([{ url: updatedOrg.logo_url, uuid: updatedOrg.id }]);
        }

        if (!hasError) {
          toast.success('Logo uploaded successfully!');
        }
      } catch (error: unknown) {
        const message = getErrorMessage(
          error,
          'Failed to upload logo. Please try again.',
        );
        toast.error(message);
      }
    }
    // Handle file deletion
    else if (files.length === 0) {
      try {
        const res = await editOrganization({
          variables: {
            id: organization.id,
            logo_url: null,
          },
        });

        const hasError = res?.errors && res.errors.length;

        if (hasError) {
          toast.error(res.errors?.[0]?.message || 'Failed to remove logo.');
        }

        await updateProfile();

        if (!hasError) {
          toast.success('Logo removed successfully!');
        }
      } catch (error: unknown) {
        const message = getErrorMessage(
          error,
          'Failed to remove logo. Please try again.',
        );
        toast.error(message);
      }
    }
  };

  const handleFaviconChange = async (files: IFile[]) => {
    setFaviconFiles(files);

    // Handle file upload
    if (files.length > 0 && files[0].file) {
      try {
        const res = await uploadFavicon({
          variables: {
            organizationId: organization.id,
            favicon: files[0].file,
          },
        });

        const hasError = res?.errors && res.errors.length;

        if (hasError) {
          toast.error(res.errors?.[0]?.message || 'Failed to upload favicon.');
        }

        const updatedOrg = await updateProfile();

        if (updatedOrg?.favicon) {
          setFaviconFiles([{ url: updatedOrg.favicon, uuid: updatedOrg.id }]);
        }

        if (!hasError) {
          toast.success('Favicon uploaded successfully!');
        }
      } catch (error: unknown) {
        const message = getErrorMessage(
          error,
          'Failed to upload favicon. Please try again.',
        );
        toast.error(message);
      }
    }
    // Handle file deletion
    else if (files.length === 0) {
      try {
        const res = await editOrganization({
          variables: {
            id: organization.id,
            favicon: null,
          },
        });

        const hasError = res?.errors && res.errors.length;

        if (hasError) {
          toast.error(res.errors?.[0]?.message || 'Failed to remove favicon.');
        }

        await updateProfile();

        if (!hasError) {
          toast.success('Favicon removed successfully!');
        }
      } catch (error: unknown) {
        const message = getErrorMessage(
          error,
          'Failed to remove favicon. Please try again.',
        );
        toast.error(message);
      }
    }
  };

  const [smtpSaving, setSmtpSaving] = useState(false);
  const [passwordFieldFocused, setPasswordFieldFocused] = useState(false);
  const smtpForm = useForm<SmtpFormData>({
    defaultValues: {
      smtp_host: '',
      smtp_port: undefined,
      smtp_secure: false,
      smtp_user: '',
      smtp_password: '',
    },
  });

  const { register, handleSubmit, reset, control, formState } =
    useForm<OrganizationFormData>({
      defaultValues: {
        name: organization?.name || '',
        domain: organization?.domain || '',
        toggle_referral_program: !!organization?.toggle_referral_program,
      },
    });

  useEffect(() => {
    if (organization) {
      const logoData = organization.logo_url
        ? [{ url: organization.logo_url, uuid: organization.id }]
        : [];
      const faviconData = organization.favicon
        ? [{ url: organization.favicon, uuid: organization.id }]
        : [];

      setLogoFiles(logoData);
      setFaviconFiles(faviconData);

      reset({
        name: organization.name,
        domain: organization.domain,
        toggle_referral_program: !!organization.toggle_referral_program,
      });
    }
  }, [organization, reset]);

  // Populate SMTP form from dedicated API (never includes password)
  useEffect(() => {
    if (smtpSettings) {
      smtpForm.reset({
        smtp_host: smtpSettings.smtp_host ?? '',
        smtp_port: smtpSettings.smtp_port ?? undefined,
        smtp_secure: smtpSettings.smtp_secure ?? false,
        smtp_user: smtpSettings.smtp_user ?? '',
        smtp_password: '',
      });
    }
  }, [smtpSettings]);

  const handleToggleChange = async (value: boolean) => {
    try {
      await editOrganization({
        variables: {
          id: organization.id,
          toggle_referral_program: value,
        },
      });

      const updatedOrg = await updateProfile();

      if (updatedOrg) {
        reset({
          name: updatedOrg.name,
          domain: updatedOrg.domain,
          toggle_referral_program: !!updatedOrg.toggle_referral_program,
        });
      }

      toast.success('Referral program setting saved');
    } catch (error: unknown) {
      const message = getErrorMessage(
        error,
        'Failed to update referral program setting.',
      );
      toast.error(message);
    }
  };

  const onSubmit = async (formData: OrganizationFormData) => {
    try {
      await editOrganization({
        variables: {
          id: organization.id,
          name: formData.name,
        },
      });

      const updatedOrg = await updateProfile();

      if (updatedOrg) {
        reset({
          name: updatedOrg.name,
          domain: updatedOrg.domain,
          toggle_referral_program: !!updatedOrg.toggle_referral_program,
        });

        toast.success('Organization updated successfully!');
      } else {
        toast.error('Failed to update user profile after organization change.');
      }
    } catch (error) {
      toast.error('Failed to update organization. Please try again.');
    }
  };

  const { errors, isDirty } = formState;

  return (
    <section>
      <Paper variant="outlined" sx={{ p: 4, mb: 3 }}>
        <div className="mb-6">
          <Typography variant="h6">Organization Details</Typography>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Organization Name"
                fullWidth
                inputRef={register({
                  required: 'Organization name is required',
                  minLength: {
                    value: 2,
                    message: 'Name must be at least 2 characters',
                  },
                })}
                error={!!errors.name}
                helperText={errors.name?.message}
                disabled={saving}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                name="domain"
                label="Organization Domain"
                fullWidth
                inputRef={register()}
                disabled
                InputProps={{
                  readOnly: true,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Button
                size="large"
                type="submit"
                disabled={!isDirty || saving || profileLoading}
                color="primary"
                variant="contained"
                disableElevation
              >
                Save Changes
              </Button>
            </Grid>

            {!!userData.is_super_admin && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="toggle_referral_program"
                  control={control}
                  defaultValue={false}
                  render={(props) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!props.value}
                          onChange={(e) => {
                            const val = e.target.checked;
                            props.onChange(val);
                            handleToggleChange(val);
                          }}
                          disabled={saving}
                        />
                      }
                      label="Enable referral program"
                    />
                  )}
                />
              </Grid>
            )}
          </Grid>
        </form>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 4, height: '100%' }}>
            <div className="mb-4">
              <Typography variant="h6">Organization Logo</Typography>
            </div>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload your organization logo. Recommended size: 1040x160px
            </Typography>

            <FileUploader
              value={logoFiles}
              onChange={handleLogoChange}
              maxFiles={1}
              acceptedExt={['.png', '.svg']}
              maxFileSize={5e6}
              disabled={uploadingLogo}
            />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 4, height: '100%' }}>
            <div className="mb-4">
              <Typography variant="h6">Organization Favicon</Typography>
            </div>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload your organization favicon. Recommended size: 1024x1024px
            </Typography>

            <FileUploader
              value={faviconFiles}
              onChange={handleFaviconChange}
              maxFiles={1}
              acceptedExt={['.png', '.svg']}
              maxFileSize={5e6}
              disabled={uploadingFavicon}
            />
          </Paper>
        </Grid>

        {isOrgOwner && (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 4 }}>
            <div className="mb-4">
              <Typography variant="h6">Organization Email (SMTP)</Typography>
            </div>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Use your own SMTP server to send emails (e.g. invitations, reports) from your organization.
              Leave password blank to keep the current one.
            </Typography>
            {!smtpSettingsLoading && smtpSettings?.smtp_user && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Current SMTP settings
                </Typography>
                <Typography variant="body2" component="span">
                  Host: {smtpSettings.smtp_host || '—'} · Port: {smtpSettings.smtp_port ?? '—'} · Encryption:{' '}
                  {smtpSettings.smtp_secure ? 'SSL/TLS' : 'None'} · User: {smtpSettings.smtp_user} · Password:{' '}
                  <Typography component="span" variant="body2" sx={{ letterSpacing: 1 }}>
                    ••••••••
                  </Typography>
                </Typography>
              </Paper>
            )}
              <form
                onSubmit={smtpForm.handleSubmit(async (data) => {
                  setSmtpSaving(true);
                  try {
                    await editOrganization({
                      variables: {
                        id: organization.id,
                        smtp_host: data.smtp_host || null,
                        smtp_port: data.smtp_port || null,
                        smtp_secure: data.smtp_secure,
                        smtp_user: data.smtp_user || null,
                        smtp_password: data.smtp_password?.trim() || undefined,
                      },
                    });
                    await refetchSmtpSettings();
                    await updateProfile();
                    smtpForm.reset({ ...data, smtp_password: '' });
                    toast.success('SMTP settings saved.');
                  } catch (error: unknown) {
                    const message = getErrorMessage(
                      error,
                      'Failed to save SMTP settings.',
                    );
                    toast.error(message);
                  } finally {
                    setSmtpSaving(false);
                  }
                })}
              >
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="smtp_host"
                      control={smtpForm.control}
                      render={({ value, onChange }) => (
                        <TextField
                          label="SMTP Host"
                          fullWidth
                          placeholder="e.g. smtp.hostinger.com"
                          value={value ?? ''}
                          onChange={(e) => onChange(e.target.value)}
                          disabled={smtpSaving}
                          autoComplete="off"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Controller
                      name="smtp_port"
                      control={smtpForm.control}
                      render={({ value, onChange }) => (
                        <TextField
                          label="Port"
                          type="number"
                          fullWidth
                          placeholder="e.g. 465"
                          value={value ?? ''}
                          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                          disabled={smtpSaving}
                          autoComplete="off"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Controller
                      name="smtp_secure"
                      control={smtpForm.control}
                      render={({ value, onChange }) => (
                        <FormControl fullWidth disabled={smtpSaving}>
                          <InputLabel id="smtp-encryption-label">Encryption</InputLabel>
                          <Select
                            labelId="smtp-encryption-label"
                            label="Encryption"
                            value={value === true ? 'ssl' : value === false ? 'none' : 'none'}
                            onChange={(e) => onChange(e.target.value === 'ssl')}
                          >
                            <MenuItem value="ssl">SSL/TLS</MenuItem>
                            <MenuItem value="none">None</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="smtp_user"
                      control={smtpForm.control}
                      render={({ value, onChange }) => (
                        <TextField
                          label="Email (SMTP user)"
                          type="email"
                          fullWidth
                          placeholder="e.g. you@yourdomain.com"
                          value={value ?? ''}
                          onChange={(e) => onChange(e.target.value)}
                          disabled={smtpSaving}
                          autoComplete="off"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="smtp_password"
                      control={smtpForm.control}
                      render={({ value, onChange }) => {
                        const hasSavedPassword = !!smtpSettings?.smtp_user;
                        const showMask =
                          hasSavedPassword && !passwordFieldFocused && !(value ?? '');
                        const displayValue = showMask ? '••••••••' : (value ?? '');
                        return (
                          <TextField
                            label="Password"
                            type={showMask ? 'text' : 'password'}
                            fullWidth
                            placeholder="Leave blank to keep current"
                            value={displayValue}
                            onChange={(e) => {
                              if (!showMask) onChange(e.target.value);
                            }}
                            onFocus={() => setPasswordFieldFocused(true)}
                            onBlur={() => setPasswordFieldFocused(false)}
                            disabled={smtpSaving}
                            autoComplete="new-password"
                            helperText={
                              hasSavedPassword
                                ? 'Password is set (hidden). Enter a new value only to change it.'
                                : undefined
                            }
                          />
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      disableElevation
                      disabled={smtpSaving}
                    >
                      Save SMTP settings
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </Paper>
          </Grid>
        )}
      </Grid>
    </section>
  );
};

export default Settings;
