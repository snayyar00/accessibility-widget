import React, { useEffect, useState } from 'react';
import "./DropDown.css";
import { useMutation, useQuery } from '@apollo/client';
import deleteSite from '@/queries/sites/deleteSite';
import { MdDelete } from "react-icons/md";
import { toast } from 'react-toastify';
import AddDomainModal from './AddDomainModal'

interface siteDetails {
  url: string,
  id: number | string | null | undefined
}

const DropDown = ({ data, setReloadSites, selectedOption, setSelectedOption }: any) => {

  // const [selectedOption, setSelectedOption] = useState<string>('Select a Domain');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showPopup, setShowPopup] = useState(false);
  const [deleteSiteMutation] = useMutation(deleteSite, {
    onCompleted: () => {
      setReloadSites(true);
    },
    onError: (error) => {
      toast.error('There was an error while deleting the domain from the database.');
    }
  })

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
    setIsOpen(false);
  };

  const handleDeleteDomain = (url: string) => {
    deleteSiteMutation({ variables: { url } });
  }


  return (
    <div className="dropdown-container relative w-full text-left mt-5">
      <button
        type="button"
        className="dropdown-btn mr-5 inline-flex justify-between w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm focus:outline-none focus:border-blue-500"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {selectedOption}
        <svg
          className="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu origin-top-right absolute right-0 mt-2 w-full overflow-x-auto rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {data && data.getUserSites.map((site: siteDetails) => (
              <div
                key={site.id}
                className="dropdown-item flex justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                role="menuitem"
                tabIndex={0}
                onClick={() => handleOptionClick(site.url)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleOptionClick(site.url);
                  }
                }}
              >
                {site.url}
                <button onClick={() => handleDeleteDomain(site.url)}>
                  <MdDelete color='#EC4545' size={16} />
                </button>
              </div>
            ))}

            <div
              key={-5}
              className="dropdown-item block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer hover:text-[#0033ED] text-[#a6a6a6] "
              role="menuitem"
              tabIndex={0}
              onClick={() => {
                setShowPopup(true);
                setIsOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setShowPopup(true)
                  setIsOpen(false);
                }
              }}
            >
              Add New Domain
            </div>


          </div>
        </div>
      )}
      {showPopup && <AddDomainModal setShowPopup={setShowPopup} setReloadSites={setReloadSites} />}
    </div>
  );
};

export default DropDown;
