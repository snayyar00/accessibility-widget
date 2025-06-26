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
import AccessibilityWidgetPage from '@/containers/Teams/editWidget';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';

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
  const { data, refetch,startPolling,stopPolling } = useQuery(getSites);
  const { data: userData, loading } = useSelector((state: RootState) => state.user);
  const [customerData,setCustomerData] = useState(null);


  const customerCheck = async () => {
    const url = `${process.env.REACT_APP_BACKEND_URL}/check-customer`;
    const bodyData = { email:userData?.email,userId:userData?.id};

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        response.json().then(data => {
          if(data){
            setCustomerData(data);
          }
        });
      })
      .catch(error => {
        // Handle error
        console.error('There was a problem with the fetch operation:', error);
      });
  }

  useEffect(() => {
    const url = new URL(window.location.href);

    // If our page is the returnUrl and has a session_id param...
    if (url.searchParams.has('session_id')) {
      console.log("polling");
      startPolling(2000);              // :contentReference[oaicite:0]{index=0}
    }

    // Clean up on unmount: stop polling
    return () => {
      stopPolling();                  // :contentReference[oaicite:1]{index=1}
    };
  }, []);

  useEffect(()=>{
    if(userData){
      customerCheck();
    }

  },[])


  useEffect(() => {
    if (reloadSites) {
      refetch();
      setReloadSites(false);
    }
  }, [reloadSites]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('session_id')) {
      
      startPolling(2000);
    }
    return () => {
      
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  

  useEffect(() => {

    if (data) {
      if (data.getUserSites.length > 0) {
        setSelectedOption(data.getUserSites[0].url);
        setDomainData(data.getUserSites[0]);
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

  useEffect(()=>{
    if(domainData)
    {
      try {
        if (window.location.pathname.startsWith("/domain-plans/"))
        {
          const numberPattern = /\d+/;  // Regular expression to match one or more digits
          const match = Number(window.location.pathname.match(numberPattern));
          const id = data.getUserSites.filter((site: siteDetails) => site.id === match)[0];
          setSelectedOption(id['url']);
        } 
      } catch (error) {
        console.log("error",error);
      }
    }
  },[window.location.pathname])


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
            <Route path='/dashboard' render={() => <Dashboard domain={selectedOption} customerData={customerData} domainData={domainData} allDomains={data} setReloadSites={setReloadSites} />} key='/dashboard' exact={false} />
            <Route path='/add-domain' render={() => <Teams domains={data} customerData={customerData} setReloadSites={setReloadSites} /> } key='/Add-Domain' exact={false} />
            <Route path='/domain-plans/:id' render={() => <SiteDetail domains={data} setReloadSites={setReloadSites} /> } key='/Domain-Plans' exact={false} />
            <Route path='/installation' render={() => <Installation domain={selectedOption} />} key='/installation' exact={false} />
            <Route path='/customize-widget' render={() => <AccessibilityWidgetPage selectedSite={selectedOption} allDomains={data} />} key='/customize-widget' exact={false} />
            <Redirect from="*" to="/dashboard" />
          </Switch>
        </div>
      </div>
    </div>
  )
};

export default AdminLayout;
