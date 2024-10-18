import React, { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import addSite from '@/queries/sites/addSite';
import { toast } from 'react-toastify';
import { CircularProgress } from '@mui/material';
import isValidDomain from '@/utils/verifyDomain';


interface AddDomainModalProps {
  setShowPopup: (show: boolean) => void;
  setReloadSites: (show: boolean) => void;
}

export default function AddDomainModal({ setShowPopup, setReloadSites }: AddDomainModalProps) {

  const [newDomain, setNewDomain] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const [addSiteMutation, { loading }] = useMutation(addSite, {
    onCompleted: (data) => {
      // Assuming 'data' has a field to confirm the success of the mutation
      // You might need to adjust the field name according to your actual GraphQL response
      if (data.addSite.includes('success')) {
        toast.success('Domain was successfully added.');
        setReloadSites(true);
        setShowPopup(false);
      }
      else if(data.addSite.includes('already')){
        toast.error(data.addSite);
        setShowPopup(false);
      }
    },
    onError: (error) => {
      toast.error('There was an error while adding the domain.');
    }
  });

  const handleClickOutside = (event: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      setShowPopup(false);
    }
  };

  const handleAddNewDomain = () => {
    if (newDomain === '' || newDomain === ' ') {
      toast.error('The domain name can not be empty and it cannot contain any spaces.');
      setShowPopup(false);
      return;
    }
    if (!isValidDomain(newDomain)){
      toast.error('You must enter a valid domain name!');
      setShowPopup(false)
      return;
    }
    const sanitizedDomain = newDomain.replace(/^(https?:\/\/)?(www\.)?/, '');
    addSiteMutation({ variables: { url: sanitizedDomain } });

  };


  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[10001] ">
      <div
        className="absolute top-36 sm:left-[50%] left-[15.6rem] transform -translate-x-1/2 w-full max-w-md p-5 bg-white shadow-lg rounded-md border outline-dark-gray"
        ref={modalRef}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Add New Domain</h3>
          <button
            onClick={() => setShowPopup(false)}
            className="text-gray-400 hover:text-red transition-colors duration-300"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form className="mt-2">
          <input
            type="text"
            placeholder="Add a new domain here"
            className="mt-3 px-4 py-2 border rounded-md w-full focus:outline-none focus:border-blue-500 border-gray-300"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
          />
          <div className="mt-4">
            <button
              id="submit-btn"
              type="button"
              className="px-4 py-2 bg-blue-500 text-white bg-primary bg text-base font-medium rounded-md w-full shadow-sm hover:bg-sapphire-blue focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors duration-300"
              onClick={handleAddNewDomain}
            >
              Add Domain
              <span className='ml-3 inline-block'>
                {loading && <CircularProgress size={14} sx={{ color: 'white'}} />}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}