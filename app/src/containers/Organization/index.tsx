import React, { useEffect, useState, useCallback } from 'react';
import { RootState } from '@/config/store';
import { useSelector, useDispatch } from 'react-redux';
import { Redirect } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useLazyQuery } from '@apollo/client';
import { TextField, Button, Grid, Paper, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { getErrorMessage } from '@/helpers/error.helper';

import EDIT_ORGANIZATION from '@/queries/organization/editOrganization';
import UPLOAD_ORGANIZATION_LOGO from '@/queries/organization/uploadOrganizationLogo';
import UPLOAD_ORGANIZATION_FAVICON from '@/queries/organization/uploadOrganizationFavicon';
import GET_PROFILE from '@/queries/auth/getProfile';
import { setProfileUser } from '@/features/auth/user';
import FileUploader, { IFile } from '@/components/Common/Input/FileUploader';

interface OrganizationFormData {
  name: string;
  domain: string;
}

const Organization: React.FC = () => {
  const dispatch = useDispatch();

  const { data: userData } = useSelector((state: RootState) => state.user);
  const organization = userData?.currentOrganization;

  const [logoFiles, setLogoFiles] = useState<IFile[]>([]);
  const [faviconFiles, setFaviconFiles] = useState<IFile[]>([]);

  const hasAccess = userData.isAdminOrOwnerOrSuper && organization;

  if (!hasAccess) {
    return <Redirect to="/" />;
  }

  const [editOrganization, { loading: saving }] =
    useMutation(EDIT_ORGANIZATION);

  const [uploadLogo, { loading: uploadingLogo }] = useMutation(
    UPLOAD_ORGANIZATION_LOGO,
  );

  const [uploadFavicon, { loading: uploadingFavicon }] = useMutation(
    UPLOAD_ORGANIZATION_FAVICON,
  );

  const [getProfile, { loading: profileLoading }] = useLazyQuery(GET_PROFILE);

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

  const { register, handleSubmit, reset, formState } =
    useForm<OrganizationFormData>({
      defaultValues: {
        name: organization?.name || '',
        domain: organization?.domain || '',
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
      });
    }
  }, [organization, reset]);

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
    <section className="p-2 md:p-4 relative">
      <h1 className="text-3xl font-bold text-gray-900 md:text-4xl mb-8 hidden lg:block lg:pr-[300px]">
        Organization Settings
      </h1>

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
              acceptedExt={['.jpg', '.jpeg', '.png', '.svg']}
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
      </Grid>
    </section>
  );
};

export default Organization;
