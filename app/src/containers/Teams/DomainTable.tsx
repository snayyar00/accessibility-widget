import deleteSite from '@/queries/sites/deleteSite';
import updateSite from '@/queries/sites/updateSite';
import { useMutation } from '@apollo/client';
import { useEffect, useState } from 'react';
import { FaTrash, FaCheck, FaTimes, FaDollarSign } from 'react-icons/fa';
import { HiMiniPencil } from "react-icons/hi2";
import { FaGear } from "react-icons/fa6";
import { toast } from 'react-toastify';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';


const DomainTable = ({ data, setReloadSites,setPaymentView,openModal,setOptionalDomain}: any) => {
  const [domains, setDomains] = useState([
    { id: 0, url: '', expiredAt: '', status: '',trial:0 }
  ]);
  const { data: userData, loading: userLoading } = useSelector((state: RootState) => state.user);
  const [billingLoading,setBillingLoading] = useState(false);
  const [activePlan,setActivePlan] = useState("");
  const [isYearly,setIsYearly] = useState(false);

  const [deleteSiteMutation] = useMutation(deleteSite, {
    onCompleted: (response) => {
      setReloadSites(true);
      if (response.deleteSite === 1){
        toast.success('The domain was successfully deleted from the database.')
      }
    },
    onError: (error) => {
      toast.error('There was an error while deleting the domain from the database.');
    }
  })
  const [updateSiteMutation] = useMutation(updateSite, {
    onCompleted: (response) => {
      setReloadSites(true);
      if (response.changeURL.includes('Successfully')){
        toast.success('The domain name was successfully updated in the database.')
      }
    },
    onError: (error) => {
      toast.error('There was an error while editing the domain name.');
    }
  })
  const [editingId, setEditingId] = useState(null);
  const [tempDomain, setTempDomain] = useState('');

  const handleDelete = async (id: number) => {
    // Here you would also handle the deletion on the backend
    const index = domains.findIndex(domain => domain.id === id)
    const foundUrl = domains[index].url;
    await deleteSiteMutation({ variables: { url:foundUrl } });
    setDomains(domains.filter((domain) => domain.id !== id));
  };

  const handleEdit = (domain: any) => {
    setEditingId(domain.id);
    setTempDomain(domain.url);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleSave = (id: number) => {
    setDomains(domains.map((domain) => (domain.id === id ? { ...domain, url: tempDomain } : domain)));
    updateSiteMutation({variables: {siteId: editingId, url: tempDomain}})
    setEditingId(null);
  };

  const applyStatusClass = (status: string,trial:number): string => {
    if (!status) {
      return 'bg-yellow-200 text-200';
    }
    if(trial)
    {
      return 'bg-yellow-200 text-200';
    }
    const currentTime = new Date().getTime();
    const timeDifference = new Date(parseInt(status)).getTime() - currentTime;
    const sevendays = 7 * 24 * 60 * 60 * 1000;

    if (timeDifference > sevendays) {
      return 'bg-green-200 text-green-600';
    }
    if (timeDifference < sevendays && timeDifference > 0) {
      return 'bg-red-200 text-red-600';
    }
    return 'bg-yellow-200 text-200';
  }

  const getDomainStatus = (status: string,trial:number): string => {
    if (!status) {
      return 'Not Available';
    }
    const currentTime = new Date().getTime();
    const timeDifference = new Date(parseInt(status)).getTime() - currentTime;
    const sevendays = 7 * 24 * 60 * 60 * 1000;

    if (timeDifference > sevendays) {
      return 'Active';
    }
    if (timeDifference < sevendays && timeDifference > 0) {
      if(trial == 1)
      {
        return 'Trial'
      }
      else
      {
        return 'Expiring';
      }
    }
    return 'Expired';
  }

  const customerCheck = async () => {

    const url = `${process.env.REACT_APP_BACKEND_URL}/check-customer`;
    const bodyData = { email: userData.email, userId: userData.id };

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
                // Handle the JSON data received from the backend
                if (data.isCustomer == true) {
                    setActivePlan(data.plan_name);
                    if (data.interval == "yearly") {
                        setIsYearly(true);
                    }
                }
            });
        })
        .catch(error => {
            // Handle error
            console.error('There was a problem with the fetch operation:', error);
        });
}

  const handleSubscription = async (selectedDomain:any) => {
    setBillingLoading(true);
    const url = `${process.env.REACT_APP_BACKEND_URL}/create-subscription`;
    const bodyData = { email: userData.email, returnURL: window.location.href, planName: activePlan, billingInterval: isYearly ? "YEARLY" : "MONTHLY", domainId: selectedDomain.id, domainUrl: selectedDomain.url, userId: userData.id };

    try {
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
                    toast.success('The domain was successfully added to your active plan');
                    setBillingLoading(false);
                    window.location.reload();
                });
            })
            .catch(error => {
                // Handle error
                toast.error('You have reached the maximum number of allowed domains for this plan');
                console.error('There was a problem with the fetch operation:', error);
            });
    } catch (error) {
        console.log("error", error);
    }

}

  useEffect(() => {
    if (data) {
      setDomains(data.getUserSites);
    }
  }, [data])

  useEffect(()=>{
    customerCheck();
  },[])

  return (
    <div className="container mx-auto px-4 sm:px-8">
      <div className="py-8">
        <div>
          <h2 className="text-2xl font-semibold leading-tight">Added Domains</h2>
        </div>
        <div className="my-2 flex sm:flex-row flex-col">
          <div className="block relative">

          </div>
        </div>
        <div className="-mx-4 sm:-mx-8 px-4 sm:px-8 py-4 overflow-x-auto">
          <div className="inline-block min-w-full shadow rounded-lg overflow-hidden">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th
                    className="px-5 py-3 border-b-2 border-light-grey bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Domain Name
                  </th>
                  <th
                    className="px-5 py-3 border-b-2 border-light-grey bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    License Status
                  </th>
                  <th
                    className="px-5 py-3 border-b-2 border-light-grey bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Expiration Date
                  </th>
                  <th
                    className="px-5 py-3 border-b-2 border-light-grey bg-gray-100"> </th>
                </tr>
              </thead>
              <tbody>
                {domains.map((domain) => (
                  <tr key={domain.id}>
                    <td className="px-5 py-5 border-b border-light-grey bg-white text-sm">
                      <div className="flex items-center">
                        <div className="ml-3">
                          <p className="text-gray-900 whitespace-no-wrap">
                            {editingId === domain.id ? (
                              <input
                                type="text"
                                value={tempDomain}
                                onChange={(e) => setTempDomain(e.target.value)}
                                className="border p-2 rounded bg-gray font-medium"
                              />
                            ) : (
                              <span>{domain.url}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5 border-b border-light-grey bg-white text-sm">
                      <p className={`p-1.5 text-xs font-semibold rounded w-fit whitespace-no-wrap ${applyStatusClass(domain.expiredAt,domain.trial)}`}>{getDomainStatus(domain.expiredAt,domain.trial)}</p>
                    </td>
                    <td className="px-5 py-5 border-b border-light-grey bg-white text-sm">
                      <p className="text-gray-900 whitespace-no-wrap">{domain.expiredAt ? (new Date(parseInt(domain.expiredAt))).toLocaleString() ?? "-" : "-"}</p>
                    </td>
                    <td className="px-5 py-5 border-b border-light-grey bg-white text-sm text-right">
                      {editingId === domain.id ? (
                        <div className="flex justify-end items-center space-x-2">
                          <button
                            onClick={() => handleSave(domain.id)}
                            className="p-2 text-green-600 hover:text-green-800"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-2 text-red-600 hover:text-red-800"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end items-center space-x-2">
                          {getDomainStatus(domain.expiredAt, domain.trial) == 'Active' || getDomainStatus(domain.expiredAt, domain.trial) == 'Expiring' ? (null) : (activePlan !== "" ? (<button disabled={billingLoading} onClick={() => { handleSubscription(domain) }} type="submit" className="py-3 text-white text-center rounded-xl bg-primary hover:bg-sapphire-blue w-[45%] sm:my-4 sm:w-full transition duration-300">
                            {billingLoading ? "Please Wait..." : "Activate"}
                          </button>) : (<button onClick={() => { setPaymentView(true); openModal(); setOptionalDomain(domain.url) }} type="submit" className="py-3 text-white text-center rounded-xl bg-green-400 hover:bg-green-600 w-[45%] sm:my-4 sm:w-full transition duration-300">
                            Activate License
                          </button>))}
                          <button
                            onClick={() => handleEdit(domain)}
                            className="p-2 text-indigo-600 hover:text-indigo-800"
                          >
                            {/* <HiMiniPencil /> */}
                            <FaGear/>
                          </button>
                          {/* <NavLink
                            to={`/domain-plans/${domain.id}`}
                            className="p-2 text-green-600 hover:text-green-800"
                          >
                            <FaDollarSign />
                          </NavLink> */}
                          <button
                            onClick={() => handleDelete(domain.id)}
                            className="p-2 text-red-600 hover:text-red-800"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainTable;
