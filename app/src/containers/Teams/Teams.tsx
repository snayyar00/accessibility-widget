import React, { useState, FormEvent, useEffect } from 'react';
import './Teams.css';
import { useMutation } from '@apollo/client';
import addSite from '@/queries/sites/addSite';
import { toast } from 'react-toastify';
import isValidDomain from '@/utils/verifyDomain';
import DomainTable from './DomainTable';
import TrialBannerAndModal from '../Dashboard/TrialBannerAndModal';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';
import TourGuide from '@/components/Common/TourGuide';
import { useLocation } from 'react-router-dom';
import { defaultTourStyles } from '@/config/tourStyles';
import { addDomainTourSteps, tourKeys } from '@/constants/toursteps';

interface DomainFormData {
  domainName: string;
}

const Teams = ({ domains, setReloadSites,customerData }: any) => {
   const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.add_domain') });
  const location = useLocation();
  
  const [addSiteMutation, { error, loading }] = useMutation(addSite, {
    onCompleted: () => {
      setReloadSites(true);
      toast.success('The domain was successfully added to the database.');
    },
  });
  // const [formData, setFormData] = useState<DomainFormData>({ domainName: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = () => {setIsModalOpen(true)};
  const closeModal = () => {setIsModalOpen(false);setOptionalDomain("yes");setPaymentView(false);};
  const [paymentView, setPaymentView] = useState(false);
  const [optionalDomain,setOptionalDomain] = useState("yes");

  // Check if user has no domains for tour condition
  const hasNoDomains = !domains?.getUserSites || domains.getUserSites.length === 0;
  
  // Check if modal should open automatically (coming from dashboard)
  const searchParams = new URLSearchParams(location.search);
  const shouldOpenModal = searchParams.get('open-modal') === 'true';
  
  // Automatically open modal if query parameter is present
  useEffect(() => {
    if (shouldOpenModal) {
      setIsModalOpen(true);
      
      // If tour should start and modal is opening, restart tour from step 2 after a delay
      const tourCompleted = localStorage.getItem('add_domain_unified_tour_completed') === 'true';
      if (!tourCompleted) {
        setTimeout(() => {
          // Trigger a tour restart from step 2 by dispatching a custom event
          const event = new CustomEvent('startTour', { 
            detail: { 
              tourKey: 'add_domain_unified_tour',
              startStep: 1 // Step 2 (index 1)
            } 
          });
          window.dispatchEvent(event);
        }, 1000); // Wait for modal to fully open
      }
    }
  }, [shouldOpenModal]);
  


  // Handle tour completion
  const handleTourComplete = () => {
    console.log('Add domain tour completed!');
    // Optionally show a success message or redirect
  };

  // const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setFormData({ ...formData, [e.target.name]: e.target.value });
  // };

  // const handleSubmit = async (e: FormEvent) => {
  //   e.preventDefault();
  //   if (!isValidDomain(formData.domainName)) {
  //     toast.error('You must enter a valid domain name!');
  //     return;
  //   }
  //   // const sanitizedDomain = formData.domainName.replace(/^(https?:\/\/)/, '');
  //   const sanitizedDomain = formData.domainName.replace(/^(https?:\/\/)?(www\.)?/, '');
  //   addSiteMutation({ variables: { url: sanitizedDomain } })

  // };

  return (
    <>
      {/* Unified tour that adapts to current UI state */}
      <TourGuide
        steps={addDomainTourSteps}
        tourKey={tourKeys.addDomain}
        autoStart={true}
        onTourComplete={handleTourComplete}
        customStyles={defaultTourStyles}
        currentState={{
          isModalOpen: isModalOpen,
          isPaymentView: paymentView
        }}
      />

      <h3 className="font-bold text-[26px] leading-9 text-sapphire-blue mb-8">
        Add new domain
      </h3>
      <div className="add-domain-container">
        {/* <div className="add-domain-form-container">
          <form onSubmit={handleSubmit} className="add-domain-form">
            <div className="form-group">
              <input
                type="text"
                id="domainName"
                name="domainName"
                placeholder="Add a new domain name"
                value={formData.domainName}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>
            
            <button type="submit" className="submit-btn">
              {loading ? 'Adding...' : 'Add Domain'}
            </button>
          </form>
          
          {error ? (
            toast.error('There was an error adding the domain to the database.')
          ) : (
            <></>
          )}
        </div> */}
        <TrialBannerAndModal allDomains={domains} setReloadSites={setReloadSites} customerData={customerData} isModalOpen={isModalOpen} closeModal={closeModal} openModal={openModal} paymentView={paymentView} setPaymentView={setPaymentView} optionalDomain={optionalDomain}/>
        <DomainTable data={domains} setReloadSites={setReloadSites} customerData={customerData} setPaymentView={setPaymentView} openModal={openModal} setOptionalDomain={setOptionalDomain}/>
      </div>
    </>
  );
};

export default Teams;
