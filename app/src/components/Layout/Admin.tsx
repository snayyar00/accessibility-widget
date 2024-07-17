import React, { useEffect, useState } from 'react';
import { Redirect, Route, Switch,useHistory } from 'react-router-dom';


import { useQuery } from '@apollo/client';

import getSites from '@/queries/sites/getSites';

import routes from '@/routes';
import Dashboard from '@/containers/Dashboard';
import Installation from '@/containers/Installation/Installation';
import Teams from '@/containers/Teams';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SiteDetail from '@/containers/SiteDetail';

type Props = {
  signout: () => void;
  options: string[];
}

interface siteDetails {
  url: string,
  id: number | string | null | undefined
}

const AdminLayout: React.FC<Props> = ({ signout, options }) => {
  const [reloadSites, setReloadSites] = useState(false);
  const [selectedOption, setSelectedOption] = useState('Select a Domain');
  const [domainData, setDomainData] = useState(null);
  const { data, refetch } = useQuery(getSites);


  useEffect(() => {
    if (reloadSites) {
      refetch();
      setReloadSites(false);
    }
  }, [reloadSites]);

  useEffect(() => {

    if (data) {
      if (data.getUserSites.length > 0) {
        // setSelectedOption(data.getUserSites[0].url);
        // setDomainData(data.getUserSites[0]);
      }
      else {
        setSelectedOption('Add a new Domain')
        setDomainData(null);
      }
    }
  }, [data])

  const history = useHistory();

  useEffect(() => {
    if (data?.getUserSites) {
      setDomainData(data.getUserSites.filter((site: siteDetails) => site.url === selectedOption)[0]);
    }
  }, [selectedOption]);

  useEffect(()=>{
    if(domainData)
    {
      try {
        if (window.location.pathname.startsWith("/domain-plans/"))
        {
          const id = data.getUserSites.filter((site: siteDetails) => site.url === selectedOption)[0]['id'];
          history.push("/domain-plans/"+id);
        }
      } catch (error) {
        console.log("error",error);
      }
    }
  },[domainData])


  return (

    <div className="flex">
      <Sidebar options={data} setReloadSites={setReloadSites} selectedOption={selectedOption} setSelectedOption={setSelectedOption} />
      <div className="flex flex-col flex-grow">
        <Topbar signout={signout} />
        <div className="flex-grow bg-body overflow-y-auto px-[15px] py-[32px] sm:min-h-[calc(100vh_-_64px)]">
          <Switch>
            {routes.map((route) => (
              <Route
                path={route.path}
                component={route.component}
                key={route.path}
                exact={route.exact}
              />
            ))}
            <Route path='/dashboard' render={() => <Dashboard domain={selectedOption} domainData={domainData} allDomains={data} setReloadSites={setReloadSites} />} key='/dashboard' exact={false} />
            <Route path='/add-domain' render={() => <Teams domains={data} setReloadSites={setReloadSites} /> } key='/Add-Domain' exact={false} />
            <Route path='/domain-plans/:id' render={() => <SiteDetail domains={data} setReloadSites={setReloadSites} /> } key='/Domain-Plans' exact={false} />
            <Route path='/installation' render={() => <Installation domain={selectedOption} />} key='/installation' exact={false} />
            <Redirect from="*" to="/dashboard" />
          </Switch>
        </div>
      </div>
    </div>
  )
};

export default AdminLayout;
