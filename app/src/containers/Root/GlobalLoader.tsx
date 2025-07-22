import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useQuery } from '@apollo/client';
import { setOrganization } from '@/features/organization/organizationSlice';
import GET_ORGANIZATION from '@/queries/organization/getOrganization';
import CircularProgress from '@mui/material/CircularProgress';
import { Query } from '@/generated/graphql';

const GlobalLoader: React.FC = () => {
  const dispatch = useDispatch();
  const { data, loading } = useQuery<Query>(GET_ORGANIZATION);

  useEffect(() => {
    if (data && data.getOrganizationByDomain) {
      dispatch(setOrganization(data.getOrganizationByDomain));
    }
  }, [data, dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen w-screen fixed inset-0 z-50 bg-white">
        <CircularProgress size={150} />
      </div>
    );
  }

  return null;
};

export default GlobalLoader;
