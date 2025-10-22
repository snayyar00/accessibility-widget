import * as React from 'react';
import { useHistory, useParams, Link as RouterLink } from 'react-router-dom';
import { IconButton, Typography, Breadcrumbs } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from '@mui/material/Link';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useApolloClient, useLazyQuery, useQuery } from '@apollo/client';
import { Query } from '@/generated/graphql';
import GET_WORKSPACE_BY_ALIAS from '@/queries/workspace/getWorkspaceByAlias';
import GET_WORKSPACE_MEMBERS_BY_ALIAS from '@/queries/workspace/getWorkspaceMembersByAlias';
import { RootState } from '@/config/store';
import { useDispatch, useSelector } from 'react-redux';
import { InviteUser } from '@/components/Invite/InviteUser';
import GET_USER_WORKSPACES from '@/queries/workspace/getUserWorkspaces';
import GET_PROFILE from '@/queries/auth/getProfile';
import GET_USER_SITES from '@/queries/sites/getSites';
import { setProfileUser } from '@/features/auth/user';
import { TableDomains } from './TableDomains';
import { TableInvites } from './TableInvites';
import { TableMembers } from './TableMembers';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export const WorkspaceDetails = () => {
  const dispatch = useDispatch();
  const history = useHistory();
  const { alias } = useParams<{ alias: string }>();
  const client = useApolloClient();

  const [value, setValue] = React.useState(0);
  const { data: userData } = useSelector((state: RootState) => state.user);

  const [getProfile, { loading: profileLoading }] = useLazyQuery(GET_PROFILE);

  const { data: workspaceData, loading: workspaceLoading } = useQuery<Query>(
    GET_WORKSPACE_BY_ALIAS,
    {
      variables: { alias },
      skip: !alias,
    },
  );

  const { data: membersData } = useQuery<Query>(
    GET_WORKSPACE_MEMBERS_BY_ALIAS,
    {
      variables: { alias },
      skip: !alias,
      fetchPolicy: 'cache-first',
    },
  );

  const workspace = workspaceData?.getWorkspaceByAlias;
  const members = membersData?.getWorkspaceMembersByAlias || [];

  const currentUserMember = members.find(
    (member) => member.user_id === Number(userData?.id),
  );

  const userWorkspaceRole =
    currentUserMember?.role || (workspace ? 'member' : null);
  const hasAccess = !workspaceLoading && workspace !== null;

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleGoBack = () => {
    history.goBack();
  };

  const handleInvitedUpdate = () => {
    client.refetchQueries({
      include: 'active',
    });
  };

  const handleTableUpdate = async () => {
    client.refetchQueries({
      include: [GET_USER_WORKSPACES, GET_USER_SITES],
    });

    const profileResult = await getProfile();
    const profileUser = profileResult?.data?.profileUser;

    if (profileUser) {
      dispatch(
        setProfileUser({
          data: profileUser,
          loading: profileLoading,
        }),
      );
    }
  };

  return (
    <section className="p-2 md:p-4 relative">
      <div className="flex gap-x-5 items-center min-h-[43px]">
        <div className="flex-none">
          <IconButton
            onClick={handleGoBack}
            sx={{
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.08)',
              },
            }}
            size="medium"
          >
            <ArrowBackIcon />
          </IconButton>
        </div>

        <div className="hidden md:block">
          <Breadcrumbs aria-label="breadcrumb">
            <Link
              component={RouterLink}
              underline="hover"
              color="inherit"
              to="/workspaces"
            >
              Workspaces
            </Link>

            <Typography color="text.primary">
              {workspaceLoading
                ? 'Loading...'
                : workspace?.name || 'Access Denied'}
            </Typography>
          </Breadcrumbs>
        </div>

        {hasAccess && (
          <div className="ml-auto md:relative md:top-12 flex-none z-10">
            <InviteUser
              mode="workspace"
              disableSelect
              preSelectedWorkspace={workspace?.id}
              onUserInvited={handleInvitedUpdate}
              workspacesLoading={workspaceLoading}
              allWorkspaces={workspace ? [workspace] : []}
              isAdminOrOwnerOrSuper={userData?.isAdminOrOwnerOrSuper || false}
              userWorkspaceRole={userWorkspaceRole}
            />
          </div>
        )}
      </div>

      <div className="border-b border-solid border-gray-300 my-5">
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab label="Domains" {...a11yProps(0)} />
          <Tab label="Members" {...a11yProps(1)} />
          <Tab label="Invites" {...a11yProps(2)} />
        </Tabs>
      </div>

      <TabPanel value={value} index={0}>
        <TableDomains
          onUpdate={handleTableUpdate}
          alias={alias}
          hasAccess={hasAccess}
          isAdminOrOwnerOrSuper={userData?.isAdminOrOwnerOrSuper || false}
          userWorkspaceRole={userWorkspaceRole}
          currentUserId={Number(userData?.id)}
        />
      </TabPanel>

      <TabPanel value={value} index={1}>
        <TableMembers
          onUpdate={handleTableUpdate}
          alias={alias}
          hasAccess={hasAccess}
          isAdminOrOwnerOrSuper={userData?.isAdminOrOwnerOrSuper || false}
          userWorkspaceRole={userWorkspaceRole}
          currentUserId={Number(userData?.id)}
        />
      </TabPanel>

      <TabPanel value={value} index={2}>
        <TableInvites
          onUpdate={handleTableUpdate}
          alias={alias}
          hasAccess={hasAccess}
          isAdminOrOwnerOrSuper={userData?.isAdminOrOwnerOrSuper || false}
          userWorkspaceRole={userWorkspaceRole}
          currentUserId={Number(userData?.id)}
        />
      </TabPanel>
    </section>
  );
};

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <div>{children}</div>}
    </div>
  );
}
