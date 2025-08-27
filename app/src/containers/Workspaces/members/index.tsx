import * as React from 'react';
import {
  useHistory,
  useParams,
  Link as RouterLink,
  Redirect,
} from 'react-router-dom';
import { IconButton, Typography, Breadcrumbs } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Link from '@mui/material/Link';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useApolloClient, useQuery } from '@apollo/client';
import { Query } from '@/generated/graphql';
import GET_WORKSPACE_BY_ALIAS from '@/queries/workspace/getWorkspaceByAlias';
import { TableMembers } from './TableMembers';
import { TableInvites } from './TableInvites';
import { RootState } from '@/config/store';
import { useSelector } from 'react-redux';
import { InviteWorkspaceMember } from '@/components/Invite/InviteWorkspaceMember';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

export const WorkspaceMembers = () => {
  const history = useHistory();
  const { alias } = useParams<{ alias: string }>();
  const client = useApolloClient();

  const [value, setValue] = React.useState(0);
  const { data: userData } = useSelector((state: RootState) => state.user);

  const { data: workspaceData, loading: workspaceLoading } = useQuery<Query>(
    GET_WORKSPACE_BY_ALIAS,
    {
      variables: { alias },
      skip: !alias,
    },
  );

  const workspace = workspaceData?.getWorkspaceByAlias;

  if (!userData.isAdminOrOwner) {
    return <Redirect to="/" />;
  }

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleGoBack = () => {
    history.goBack();
  };

  const handleUpdate = () => {
    client.refetchQueries({
      include: 'active',
    });
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

        <div className="ml-auto md:relative md:top-12 flex-none z-10">
          <InviteWorkspaceMember
            disableSelect
            preSelectedWorkspace={workspace?.id}
            onUserInvited={handleUpdate}
            workspacesLoading={workspaceLoading}
            allWorkspaces={workspace ? [workspace] : []}
          />
        </div>
      </div>

      <div className="border-b border-solid border-gray-300 my-5">
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
        >
          <Tab label="Invites" {...a11yProps(0)} />
          <Tab label="Members" {...a11yProps(1)} />
        </Tabs>
      </div>

      <TabPanel value={value} index={0}>
        <TableInvites alias={alias} />
      </TabPanel>

      <TabPanel value={value} index={1}>
        <TableMembers alias={alias} />
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
