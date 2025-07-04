import { RootState } from "@/config/store";
import { CircularProgress } from "@mui/material";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Domain } from "./DomainTable";
import { plans } from "@/constants";
import { useLazyQuery } from "@apollo/client";
import getSitePlanQuery from '@/queries/sitePlans/getSitePlan';

interface ActivatePlanWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  billingLoading: boolean;
  setBillingLoading: (value: boolean) => void;
  domain: Domain | null;
  promoCode: number[];
  setReloadSites: (value: boolean) => void;
  isStripeCustomer: boolean;

}

const ActivatePlanWarningModal: React.FC<ActivatePlanWarningModalProps> = ({
  isOpen,
  onClose,
  billingLoading,
  setBillingLoading,
  domain,
  promoCode,
  setReloadSites,
  isStripeCustomer,
}) => {
  const { data: userData } = useSelector((state: RootState) => state.user);
  const [fetchSitePlan] = useLazyQuery(getSitePlanQuery);


  const handleDirectSubscription = async (domain:Domain|null) => {
    if(!domain) return;

    setBillingLoading(true);
    let url = `${process.env.REACT_APP_BACKEND_URL}/create-subscription`;
    const result = plans[0].id.replace(/\d+/g, "");
    
    let bodyData:any = { 
        email:userData.email,
        returnURL:window.location.href,
        planName:result,
        billingInterval:"MONTHLY",
        domainId:domain.id,
        domainUrl:domain.url,
        userId:userData.id,
        promoCode: promoCode,
        cardTrial:false 
      };

    if(!isStripeCustomer){
      url = `${process.env.REACT_APP_BACKEND_URL}/create-checkout-session`;

       bodyData = { 
        email:userData.email,
        returnUrl:window.location.href,
        planName:result,
        billingInterval:"MONTHLY",
        domainId:domain.id,
        domain:domain.url,
        userId:userData.id,
        promoCode: promoCode,
        cardTrial:false 
      };
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData),
        credentials: 'include'
      })
        .then(response => {
          response.json().then(data => {
            setBillingLoading(false);
            if(data.error){
              toast.error(`An Error Occured: ${data.error}`);
              console.log(data);
            }
            else{
              toast.success('The domain was successfully added to your active plan');
              setReloadSites(true);
              fetchSitePlan({
                variables: { siteId: domain.id }
              });
              window.location.reload();
            }
            
          });
        })
        .catch(error => {
          toast.error(`An Error Occured: ${error.message}`);
          console.error('There was a problem with the fetch operation:', error);
          setBillingLoading(false);
        });
    } catch (error) {
      console.log("error",error);
    }
  }

  if (!isOpen) return null;

  return (
    domain && (
    <>
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={billingLoading ? undefined : onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-8 w-full max-w-lg mx-4 border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Confirm Site Activation</h2>

        <p className="text-gray-700 mb-4 text-sm">
          Click <strong>Activate</strong> to activate the plan for the domain.
        </p>

        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors duration-200"
            disabled={billingLoading}
          >
            Cancel
          </button>
          <button
            onClick={() => handleDirectSubscription(domain)}
            className={`px-6 py-2 rounded-md text-white transition-colors duration-200 flex items-center ${
            !billingLoading 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
            disabled={billingLoading}
          >
            {billingLoading ? (
              <>
                <CircularProgress className="-ml-1 mr-5" size={25} sx={{ color: 'white' }} />
                Processing...
              </>
            ) : (
              "Activate"
            )}
          </button>
        </div>
      </div>
    </div>
    </>
    )
  );
};

export default ActivatePlanWarningModal;

