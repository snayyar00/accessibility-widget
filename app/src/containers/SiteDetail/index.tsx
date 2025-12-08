import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '@/config/store';
import { CircularProgress } from '@mui/material';
// import InformationSetting from './InformationSetting';
// import PasswordSetting from './PasswordSetting';
import PlanSetting from './PlanSetting';

import { useHistory, useRouteMatch } from 'react-router-dom';

export type TDomain = {
  id: string;
  url: string;
  __typename: string;
  trial?:number;
}

const SiteDetail = ({ domains, setReloadSites }: any) => {
  const [domain, setDomain] = useState<null | TDomain>(null);

  const match = useRouteMatch<{ id: string }>();

  useEffect(() => {
    const siteId = match.params.id;
    if (domains) {
      // Handle both old structure (array) and new structure (PaginatedSites)
      const sites = domains.getUserSites?.sites || domains.getUserSites || [];
      const domain = sites.filter((site: any) => site.id == siteId)[0];
      setDomain(domain)
    }
  }, [domains,match]);

  const { data, loading } = useSelector((state: RootState) => state.user);
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="font-bold text-[26px] leading-9 text-sapphire-blue mb-8">Domain Plan Settings</h3>
      {loading ? <div className='flex items-center justify-center h-screen w-screen'><CircularProgress size={150}/></div> : domain ? (
        <>
          <div className="bg-white border border-solid border-dark-grey shadow-xxl rounded-[10px] p-6 mb-[25px] sm:px-[10px] sm:py-6 pb-5">
            <h5 className="font-bold text-[22px] leading-[30px] text-sapphire-blue mb-1">
              Domain : {domain.url}
            </h5>
          </div>
          <PlanSetting key={domain.url} domain={domain} setReloadSites={setReloadSites} />
        </>
      ): (
        <div>Domain not found</div>
      )}
    </div>
  );
}

export default SiteDetail
