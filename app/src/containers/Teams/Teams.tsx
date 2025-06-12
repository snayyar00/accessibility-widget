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
import { Step, Placement } from 'react-joyride';
import { useLocation } from 'react-router-dom';
import { defaultTourStyles } from '@/config/tourStyles';

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
  
  // Unified tour steps - all steps in one tour that adapts to current state
  const unifiedTourSteps: Step[] = [
    // Step 1: Banner (always available)
    {
      target: '.add-domain-banner',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Welcome to Domain Management! 🎉</h3>
          <p>Let's add your first domain to start making your website accessible. Click the "Get Compliant Now" button to begin!</p>
        </div>
      ),
      placement: 'bottom' as Placement,
      disableBeacon: true,
    },
    // Step 2: Domain input (only show if modal is open)
    {
      target: '.domain-input-field',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Enter Your Domain 🌐</h3>
          <p>Type your website's domain name here (e.g., example.com). This is the website you want to make accessible.</p>
        </div>
      ),
      placement: 'bottom' as Placement,
      disableBeacon: true,
    },
    // Step 3: Trial options
    {
      target: '.trial-buttons-section',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Choose Your Trial Option 🎯</h3>
          <p>You have three options: 30-day trial with card, 15-day trial without card, or skip trial and buy directly. Choose what works best for you!</p>
        </div>
      ),
      placement: 'top' as Placement,
      disableBeacon: true,
    },
    // Step 4: AppSumo notice
    {
      target: '.appsumo-notice',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">AppSumo Customers 💰</h3>
          <p>If you have an AppSumo coupon, click "Skip trial & buy" and you'll be able to enter your coupon code in the next step!</p>
        </div>
      ),
      placement: 'top' as Placement,
      disableBeacon: true,
    },
    // Step 5: Skip trial button
    {
      target: '.skip-trial-button',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Skip Trial & Buy 🚀</h3>
          <p>Click this button to proceed directly to plan selection. Perfect for AppSumo customers or if you're ready to purchase immediately!</p>
        </div>
      ),
      placement: 'top' as Placement,
      disableBeacon: true,
    },
    // Step 6: Coupon input (only show if payment view is active)
    {
      target: '.coupon-input-section',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Enter Your Coupon Code 🎫</h3>
          <p>If you have an AppSumo coupon or any discount code, enter it here and click "Apply Coupon" to get your discount!</p>
        </div>
      ),
      placement: 'bottom' as Placement,
      disableBeacon: true,
    },
    // Step 7: Plan selection
    {
      target: '.plan-selection-area',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Choose Your Plan 📋</h3>
          <p>Select the plan that best fits your needs. The pricing will automatically adjust based on any coupons you've applied.</p>
        </div>
      ),
      placement: 'top' as Placement,
      disableBeacon: true,
      floaterProps: {
        disableFlip: true,
        offset: 20,
        styles: {
          floater: {
            filter: 'drop-shadow(0 0 3px rgba(0, 0, 0, 0.5))'
          }
        }
      },
    },
    // Step 8: Final checkout
    {
      target: '.checkout-button',
      content: (
        <div>
          <h3 className="text-lg font-semibold mb-2">Complete Your Purchase 💳</h3>
          <p>Click "Checkout" to proceed to Stripe's secure payment page. After payment, you'll return here with your domain activated!</p>
        </div>
      ),
      placement: 'top' as Placement,
      disableBeacon: true,
    },
  ];

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
        steps={unifiedTourSteps}
        tourKey="add_domain_unified_tour"
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
