import React, { useEffect, useRef, useState } from 'react';
import './DropDown.css';
import { useMutation, useQuery } from '@apollo/client';
import deleteSite from '@/queries/sites/deleteSite';
import { MdDelete } from 'react-icons/md';
import { toast } from 'react-toastify';
import AddDomainModal from './AddDomainModal';
import Favicon from '@/components/Common/Favicon';

interface siteDetails {
  url: string;
  id: number | string | null | undefined;
}

const DropDown = ({
  data,
  setReloadSites,
  selectedOption,
  setSelectedOption,
}: any) => {
  // const [selectedOption, setSelectedOption] = useState<string>('Select a Domain');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showPopup, setShowPopup] = useState(false);
  const [deleteSiteMutation] = useMutation(deleteSite, {
    onCompleted: () => {
      setReloadSites(true);
    },
    onError: (error) => {
      toast.error('There was an error while deleting the domain.');
    },
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
    setIsOpen(false);
  };

  const handleDeleteDomain = (url: string) => {
    deleteSiteMutation({ variables: { url } });
  };

  return (
    <div
      ref={dropdownRef}
      className="dropdown-container relative w-full text-left"
    >
      <button
        type="button"
        className="dropdown-btn mr-5 inline-flex items-center justify-between w-full rounded-lg bg-[#D4E6EF] px-3 py-2 text-sm font-medium text-[#8E95AD] focus:outline-none focus:ring-2 focus:ring-[#559EC1] focus:ring-opacity-50"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {selectedOption && (
            <Favicon
              domain={selectedOption}
              size={20}
              className="flex-shrink-0"
            />
          )}
          <span className="truncate">{selectedOption}</span>
        </div>
        <svg
          className="h-4 w-4 text-[#484848] flex-shrink-0 ml-2"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isOpen ? (
            // Up arrow
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          ) : (
            // Down arrow
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          )}
        </svg>
      </button>

      {isOpen && (
        <div className="dropdown-menu origin-top-right absolute right-0 mt-2 w-full overflow-x-auto rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
          <div
            className="py-1"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="options-menu"
          >
            {data &&
              data.getUserSites.map((site: siteDetails) => (
                <div
                  key={site.id}
                  className="dropdown-item flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                  role="menuitem"
                  tabIndex={0}
                  onClick={() => handleOptionClick(site.url)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleOptionClick(site.url);
                    }
                  }}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <Favicon
                      domain={site.url}
                      size={20}
                      className="flex-shrink-0"
                    />
                    <span className="truncate">{site.url}</span>
                  </div>
                  {/* <button onClick={() => handleDeleteDomain(site.url)}>
                  <MdDelete color='#EC4545' size={16} />
                </button> */}
                </div>
              ))}

            {/* <div
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
            </div> */}
          </div>
        </div>
      )}
      {showPopup && (
        <AddDomainModal
          setShowPopup={setShowPopup}
          setReloadSites={setReloadSites}
        />
      )}
    </div>
  );
};

export default DropDown;
