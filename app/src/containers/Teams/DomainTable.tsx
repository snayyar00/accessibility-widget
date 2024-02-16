import deleteSite from '@/queries/sites/deleteSite';
import updateSite from '@/queries/sites/updateSite';
import { useMutation } from '@apollo/client';
import React, { useEffect, useState } from 'react';
import { FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import { HiMiniPencil } from "react-icons/hi2";
import { toast } from 'react-toastify';



const DomainTable = ({ data, setReloadSites}: any) => {
  const [domains, setDomains] = useState([
    { id: 0, url: '', expiration: '', status: '' }
  ]);

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

  const handleDelete = (id: number) => {
    // Here you would also handle the deletion on the backend
    const index = domains.findIndex(domain => domain.id === id)
    const foundUrl = domains[index].url;
    deleteSiteMutation({ variables: { url:foundUrl } });
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

  const applyStatusClass = (status: string): string => {
    if (status === 'Active') {
      return 'bg-green-200 text-green-600';
    }
    if (status === 'Expired') {
      return 'bg-red-200 text-red-600';
    }
    return 'bg-yellow-200 text-200';

  }

  useEffect(() => {
    if (data) {
      setDomains(data.getUserSites);
    }
  }, [data])

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
                      <p className={`p-1.5 text-xs font-semibold rounded w-fit whitespace-no-wrap ${applyStatusClass(domain.status)}`}>{domain.status}</p>
                    </td>
                    <td className="px-5 py-5 border-b border-light-grey bg-white text-sm">
                      <p className="text-gray-900 whitespace-no-wrap">{domain.expiration}</p>
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
                          <button
                            onClick={() => handleEdit(domain)}
                            className="p-2 text-indigo-600 hover:text-indigo-800"
                          >
                            <HiMiniPencil />
                          </button>
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
