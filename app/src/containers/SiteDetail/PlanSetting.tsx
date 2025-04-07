import React, { useState, useEffect } from 'react';
import isEmpty from 'lodash/isEmpty';
import { useLazyQuery, useMutation } from '@apollo/client';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { useTranslation, Trans } from 'react-i18next';
import "./PlanSetting.css";
import { RootState } from '@/config/store';
import StripeContainer from '@/containers/Stripe';
import deleteSitePlanQuery from '@/queries/sitePlans/deleteSitePlan';
import updateSitePlanQuery from '@/queries/sitePlans/updateSitePlan';
import createSitePlanQuery from '@/queries/sitePlans/createSitePlan';
import getSitePlanQuery from '@/queries/sitePlans/getSitePlan';
import { setUserPlan } from '@/features/auth/userPlan';
import Plans from '@/components/Plans';
import Toggle from '@/components/Common/Input/Toggle';
import ErrorText from '@/components/Common/ErrorText';
import Button from '@/components/Common/Button';
import { TDomain } from '.';
import { setSitePlan } from '@/features/site/sitePlan';
import { toast } from 'react-toastify';
import { APP_SUMO_BUNDLE_NAMES } from '@/constants';
import { CircularProgress } from '@mui/material';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const plans = [
  {
    id: 'single',
    name: 'License for 1 Site',
    price: 12,
    desc: '',
    features: [
      'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
      'Accessbility Statement',
      'AI powered Screen Reader and Accessbility Profiles',
      'Web Ability accesbility Statement',
    ]
  },
  {
    id: 'single1',
    name: 'License for 1 Site',
    price: 12,
    desc: '',
    features: [
      'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
      'Accessbility Statement',
      'AI powered Screen Reader and Accessbility Profiles',
      'Web Ability accesbility Statement',
    ]
  },
  // {
  //   id: 'small tier',
  //   name: 'Small Business',
  //   price: 30,
  //   desc: '',
  //   features: [
  //     'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
  //     'Accessbility Statement',
  //     'AI powered Screen Reader and Accessbility Profiles',
  //     'Web Ability accesbility Statement',
  //   ]
  // },
  // {
  //   id: 'medium tier',
  //   name: 'Medium Business',
  //   price: 70,
  //   desc: '',
  //   features: [
  //     'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
  //     'Accessbility Statement',
  //     'AI powered Screen Reader and Accessbility Profiles',
  //     'Web Ability accesbility Statement',
  //   ]
  // },
  // {
  //   id: 'large tier',
  //   name: 'Enterprise',
  //   price: 100,
  //   desc: '',
  //   features: [
  //     'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
  //     'Accessbility Statement',
  //     'AI powered Screen Reader and Accessbility Profiles',
  //     'Web Ability accesbility Statement',
  //   ]
  // },
];

let appSumoPlansList = [{
  id: APP_SUMO_BUNDLE_NAMES[0],
  name: 'App Sumo Bundle Small',
  price: 100,
  desc: '',
  features: [
    'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
    'Accessbility Statement',
    'AI powered Screen Reader and Accessbility Profiles',
    'Web Ability accesbility Statement',
  ]
},{
  id: APP_SUMO_BUNDLE_NAMES[1],
  name: 'App Sumo Bundle Medium',
  price: 200,
  desc: '',
  features: [
    'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
    'Accessbility Statement',
    'AI powered Screen Reader and Accessbility Profiles',
    'Web Ability accesbility Statement',
  ]
},{
  id: APP_SUMO_BUNDLE_NAMES[2],
  name: 'App Sumo Bundle Large',
  price: 300,
  desc: '',
  features: [
    'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
    'Accessbility Statement',
    'AI powered Screen Reader and Accessbility Profiles',
    'Web Ability accesbility Statement',
  ]
}];


const PlanSetting: React.FC<{
  domain: TDomain,
  setReloadSites: (value: boolean) => void,
  cardTrial?:Boolean
}> = ({ domain, setReloadSites,cardTrial }) => {
  const [appSumoPlan, setAppSumoPlan] = useState(appSumoPlansList[0]);
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const { data: currentPlan } = useSelector((state: RootState) => state.sitePlan);
  const [deleteSitePlanMutation, { error: errorDelete, loading: isDeletingSitePlan }] = useMutation(deleteSitePlanQuery);
  const [updateSitePlanMutation, { error: errorUpdate, loading: isUpdatingSitePlan }] = useMutation(updateSitePlanQuery);
  const [createSitePlanMutation, { error: errorCreate, loading: isCreatingSitePlan }] = useMutation(createSitePlanQuery);
  const [fetchSitePlan, { data: sitePlanData }] = useLazyQuery(getSitePlanQuery);
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { data, loading } = useSelector((state: RootState) => state.user);
  const siteId = parseInt(domain.id);
  const [clicked, setClicked] = useState(false);
  const [coupon,setCoupon] = useState("");
  const [discount,setDiscount] = useState(0);
  const [percentDiscount,setpercentDiscount] = useState(false);
  const [isStripeCustomer,setisStripeCustomer] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {setIsModalOpen(false);window.location.reload()};
  const [billingClick,setbillingClick] = useState(false);
  const [subFailed, setSubFailed] = useState(false);
  const [currentActivePlan,setCurrentActivePlan] = useState("");
  const [showPlans,setShowPlans] = useState(false);
  const [validCoupon,setValidCoupon] = useState(false);
  const [couponClicked,setCouponClicked] = useState(false);
  const [couponStack,setCouponStack] = useState(0);
  const [validatedCoupons, setValidatedCoupons] = useState<string[]>([]);
  const [customerCheckLoading,setCustomerCheckLoading] = useState(false);

  useEffect(() => {
    customerCheck();
    dispatch(setSitePlan({ data: {} }));
    fetchSitePlan({
      variables: { siteId }
    });
  }, [])
  
  useEffect(() => {
    if (sitePlanData?.getPlanBySiteIdAndUserId) {
      dispatch(setSitePlan({ data: sitePlanData?.getPlanBySiteIdAndUserId }));
    }
  }, [sitePlanData])

  function toggle() {
    setIsYearly(!isYearly);
  }

  function changePlan(name: string) {
    setSelectedPlan(name);
  }

  function checkIsCurrentPlan(planId: string) {
    return currentPlan.productType === planId && ((currentPlan.priceType === 'monthly' && !isYearly) || (currentPlan.priceType === 'yearly' && isYearly))
  }

  async function handleCancelSubscription() {
    await deleteSitePlanMutation({
      variables: { sitesPlanId: currentPlan.id }
    });
    setReloadSites(true);
    fetchSitePlan({
      variables: { siteId }
    });
    window.location.reload();
  }

  async function createPaymentMethodSuccess(token: string) {
    if (!planChanged) return;
    const data = {
      paymentMethodToken: token,
      planName: planChanged.id,
      billingType: isYearly ? 'YEARLY' : 'MONTHLY',
      siteId: domain.id,
      couponCode:coupon,
    }
    try {
      await createSitePlanMutation({
        variables: data
      });
    } catch (error) {
      console.log("error = ",error);
    }
    
    setReloadSites(true);
    fetchSitePlan({
      variables: { siteId }
    });
  }

  async function handleChangeSubcription() {
    if (!planChanged) return;
    const result = planChanged.id.replace(/\d+/g, "");
    await updateSitePlanMutation({
      variables: {
        sitesPlanId: currentPlan.id,
        planName: result,
        billingType: isYearly ? 'YEARLY' : 'MONTHLY',
      }
    });
    setReloadSites(true);
    fetchSitePlan({
      variables: { siteId }
    });
  }

  const handleBilling = async () => {
    setClicked(true);

    const url = `${process.env.REACT_APP_BACKEND_URL}/create-customer-portal-session`;
    const bodyData = { id:sitePlanData?.getPlanBySiteIdAndUserId?.customerId,returnURL:window.location.href };

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
          window.location.href = data.url;
        });
      })
      .catch(error => {
        // Handle error
        console.error('There was a problem with the fetch operation:', error);
      });
  }

  const handleCheckout = async (card?:boolean)=>{
    setbillingClick(true);
    let url = `${process.env.REACT_APP_BACKEND_URL}/create-checkout-session`;
    const result = planChanged?.id.replace(/\d+/g, "");

    const bodyData = { email:data.email,planName:result,billingInterval:isYearly ? "YEARLY" : "MONTHLY",returnUrl:window.location.origin+"/add-domain",domainId:domain.id,userId:data.id,domain:domain.url,promoCode:validatedCoupons,cardTrial:cardTrial || card };

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    })
      .then(response => {
        // if (!response.ok) {
        //   throw new Error('Network response was not ok');
        // }
        response.json().then(data => {
          setbillingClick(false);
          if(data.error)
          {
            toast.error("An Error Occured");
            console.log(data);
            // setTimeout(()=>{window.location.reload()},2000);
          }
          else
          {
            window.location.href = data.url;
          }
        });
      })
      .catch((error) => {
        // Handle error
        toast.error(error);
        console.log("error = ",error)
        console.error('There was a problem with the fetch operation:', error);
      });
  }

  const handleSubscription = async (card?:boolean) => {
    setbillingClick(true);
    let url = `${process.env.REACT_APP_BACKEND_URL}/create-subscription`;
    const result = planChanged?.id.replace(/\d+/g, "");
    const bodyData = { email:data.email,returnURL:window.location.href, planName:result,billingInterval:!isYearly || APP_SUMO_BUNDLE_NAMES.includes((planChanged?.id || "")) ? "MONTHLY" : "YEARLY",domainId:domain.id,domainUrl:domain.url,userId:data.id,promoCode:validatedCoupons,cardTrial:card };

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
            // Handle the JSON data received from the backend
            setbillingClick(false);
            openModal();
            setReloadSites(true);
            fetchSitePlan({
              variables: { siteId }
            });
          });
        })
        .catch(error => {
          // Handle error
          console.error('There was a problem with the fetch operation:', error);
          setSubFailed(true);
          setbillingClick(false);
          openModal();
        });
    } catch (error) {
      console.log("error",error);
    }
    
  }

  const handleCouponValidation = async () => {

    if (validatedCoupons.length >= 3) {
      toast.error("You can only apply up to 3 coupons.");
      return;
    }
    // Prevent duplicate coupon validation
    if (validatedCoupons.includes(coupon)) {
      toast.error("This coupon has already been applied.");
      return;
    }

    setCouponClicked(true);
    const url = `${process.env.REACT_APP_BACKEND_URL}/validate-coupon`;
    const bodyData = { couponCode:coupon};

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
          if(data?.valid == true)
          {
            setCouponStack(prevCount => prevCount + 1);
            setValidatedCoupons(prevCoupons => [...prevCoupons, coupon]);
            setValidCoupon(true);
            setpercentDiscount(true);
            setDiscount(data.discount);
          }
          else
          {
            toast.error(data?.error);
          }
          setCouponClicked(false);
        });
      })
      .catch(error => {
        // Handle error
        setCouponClicked(false);
        console.error('There was a problem with the fetch operation:', error);
      });
  }

  useEffect(() => {
    if (validatedCoupons.length > 0) {
      // Subtract one from the length to account for zero-based indexing
      setAppSumoPlan(appSumoPlansList[validatedCoupons.length - 1]);
    } else {
      setAppSumoPlan(appSumoPlansList[0]);
    }
  }, [validatedCoupons]);

  const customerCheck = async () => {
    setCustomerCheckLoading(true);
    const url = `${process.env.REACT_APP_BACKEND_URL}/check-customer`;
    const bodyData = { email:data.email,userId:data.id};

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
          if(data.isCustomer == true && data.card)
          {
            setisStripeCustomer(true);
            setCurrentActivePlan(data.plan_name);

            if(data.interval == "year")
            {
              // setIsYearly(true);
            }
            setCustomerCheckLoading(false);
          }
        });
      })
      .catch(error => {
        // Handle error
        setCustomerCheckLoading(false);
        console.error('There was a problem with the fetch operation:', error);
      });
  }
  
  const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-4 w-1/3">
          <div className="flex justify-end">
            <button className="text-gray-800 text-3xl hover:text-gray-700" onClick={onClose}>
              ×
            </button>
          </div>
          <div>{children}</div>
        </div>
      </div>
    );
  }
  const planChanged = plans.find((item: any) => item.id === selectedPlan);

  const amountCurrent = currentPlan.amount || 0;
  const amountNew = planChanged
    ? isYearly
      ? planChanged.name == 'Enterprise'
        ? planChanged.price
        : planChanged.price
      : planChanged.price
    : 0;


  return (
    <div className="bg-white border border-solid border-dark-grey shadow-xxl rounded-[10px] p-6 mb-[25px] sm:px-[10px] sm:py-6">
      <h5 className="font-bold text-[22px] leading-[30px] text-sapphire-blue mb-1">
        {t('Profile.text.plan')} for {domain.url}
      </h5>
      <div className="p-4">
        <Modal isOpen={isModalOpen} onClose={closeModal}>
          <h2 className="text-xl font-bold mb-4">
            {subFailed
              ? 'You have reached the maximum number of allowed domains for this plan'
              : 'Plan Subscribed'}
          </h2>
          <button className="submit-btn" onClick={closeModal}>
            Close
          </button>
        </Modal>
      </div>
      <p className="text-[16px] leading-[26px] text-white-gray mb-[14px]">
        {t('Profile.text.plan_desc')}
      </p>
      <div className="flex justify-between sm:flex-col-reverse flex-col flex-wrap">
        <div>
          {/* No Plan No Sub */}
          {cardTrial ? (
            <div className="my-4 p-4 bg-[#f5f7fb] rounded-lg hover:bg-secondary/30 transition-colors duration-300">
              <h4 className="text-md font-semibold text-secondary-foreground mb-2">
                After your 30 day trial ends, you will be automatically charged
                for the plan you select
              </h4>
              <p className="text-sm text-secondary-foreground/80">
                Choose a plan and checkout, enter your details and your trial
                will begin.
              </p>
              <p className="text-sm text-secondary-foreground/80">
                Don't worry you won't be charged before your trial ends
              </p>
            </div>
          ) : null}

          {/* {(true || currentPlan.isTrial ||
            showPlans ||
            ((planChanged || Object.keys(currentPlan).length == 0) &&
              Object.keys(currentPlan).length == 0 &&
              currentActivePlan == '')) && (
            <div className="flex justify-center mb-[25px] sm:mt-[25px] [&_label]:mx-auto [&_label]:my-0">
              <Toggle onChange={toggle} label="Bill Yearly" />
            </div>
          )} */}
          <div>
            {planChanged && (
              <div className="p-6 sm:mx-2 mx-32 lg:mx-80 screen-4k-mx-80 mb-3 border border-solid border-dark-gray rounded-[10px] flex sm:p-6 sm:flex-col-reverse flex-col flex-wrap">
                {checkIsCurrentPlan(planChanged.id) ? (
                  <div className="min-w-[300px] [&_button]:w-full">
                    {currentPlan.deletedAt ? (
                      <p>
                        Plan will expire on{' '}
                        <b>
                          {dayjs(currentPlan.expiredAt).format(
                            'YYYY-MM-DD HH:mm',
                          )}
                        </b>
                        <Trans
                          components={[<b></b>]}
                          values={{
                            data: dayjs(currentPlan.expiredAt).format(
                              'YYYY-MM-DD HH:mm',
                            ),
                          }}
                        >
                          {t('Profile.text.expire')}
                        </Trans>
                      </p>
                    ) : (
                      <>
                        {sitePlanData?.getPlanBySiteIdAndUserId ? (
                          <div className="flex items-center mt-2 mb-2">
                            <Button
                              color="primary"
                              onClick={handleBilling}
                              disabled={clicked}
                            >
                              {clicked ? 'redirecting...' : 'Manage billing'}
                            </Button>
                          </div>
                        ) : null}
                        <Button
                          color="primary"
                          disabled={isDeletingSitePlan}
                          onClick={handleCancelSubscription}
                        >
                          {t('Profile.text.cancel_sub')}
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col min-w-[300px]">
                    <div className="font-bold text-[22px] leading-[30px] text-sapphire-blue mb-6">
                      {t('Profile.text.order_sumary')}
                    </div>
                    <ul className="flex-grow">
                      <li className="flex justify-between items-center list-none mb-4">
                        <p className="text-[16px] leading-[26px] text-white-gray flex-grow">
                          {t('Profile.text.curreny_sub')}
                        </p>
                        <span className="font-bold text-[18px] leading-6 text-sapphire-blue">
                          ${amountCurrent}
                        </span>
                      </li>
                      <li className="flex justify-between items-center list-none mb-4">
                        <p className="text-[16px] leading-[26px] text-white-gray flex-grow">
                          {t('Profile.text.new_sub')}
                        </p>
                        <span
                          className="font-bold text-[18px] leading-6 text-sapphire-blue"
                          style={{
                            textDecoration:
                              coupon !== '' ? 'line-through' : 'none',
                          }}
                        >
                          ${isYearly ? amountNew * 10 : amountNew}
                        </span>
                        {coupon !== '' ? (
                          <span className="font-bold text-[18px] leading-6 pl-2 text-sapphire-blue">
                            $
                            {isYearly
                              ? amountNew * 10 -
                                (percentDiscount
                                  ? amountNew * 10 * discount
                                  : discount)
                              : amountNew -
                                (percentDiscount
                                  ? amountNew * discount
                                  : discount)}
                          </span>
                        ) : null}
                      </li>
                      <li className="flex justify-between items-center list-none mb-4">
                        <p className="text-[16px] leading-[26px] text-white-gray flex-grow">
                          {t('Profile.text.balance_due')}
                        </p>
                        <span
                          className="font-bold text-[18px] leading-6 text-sapphire-blue"
                          style={{
                            textDecoration:
                              coupon !== '' ? 'line-through' : 'none',
                          }}
                        >
                          $
                          {Math.max(
                            (isYearly ? amountNew * 10 : amountNew) -
                              amountCurrent,
                            0,
                          )}
                        </span>
                        {coupon !== '' ? (
                          <span className="font-bold text-[18px] leading-6 pl-2 text-sapphire-blue">
                            $
                            {Math.max(
                              (isYearly
                                ? amountNew * 10 -
                                  (percentDiscount
                                    ? amountNew * 9 * discount
                                    : discount)
                                : amountNew -
                                  (percentDiscount
                                    ? amountNew * discount
                                    : discount)) - amountCurrent,
                              0,
                            )}
                          </span>
                        ) : null}
                      </li>
                    </ul>
                    {isEmpty(currentPlan) ||
                    (currentPlan && currentPlan.deletedAt) ||
                    currentPlan.isTrial ? (
                      // <StripeContainer
                      //   onSubmitSuccess={createPaymentMethodSuccess}
                      //   apiLoading={isCreatingSitePlan}
                      //   submitText={
                      //     currentPlan &&
                      //     currentPlan.deletedAt &&
                      //     (t('Profile.text.change_plan') as string)
                      //   }
                      //   setCoupon={setCoupon}
                      //   setDiscount={setDiscount}
                      //   setpercentDiscount={setpercentDiscount}
                      // />
                      customerCheckLoading ? 
                      <div className='flex justify-center'>
                        <CircularProgress size={40}/>
                      </div>
                       :
                      isStripeCustomer ? (
                        <>
                          {coupon == '' && validatedCoupons.length == 0 ? (
                            <Button
                              color="primary"
                              onClick={() => {
                                handleSubscription(true);
                              }}
                              className="get-start-btn"
                            >
                              {billingClick ? 'Please Wait...' : '30 Day Trial'}
                            </Button>
                          ) : null}

                          <Button
                            color="primary"
                            className="get-start-btn w-full mt-4"
                            onClick={() => {
                              handleSubscription(false);
                            }}
                          >
                            {billingClick ? 'Please Wait...' : 'Add to Billing'}
                          </Button>
                        </>
                      ) : (
                        <>
                          {coupon != '' && validatedCoupons.length == 0 ? (
                            <Button
                              color="primary"
                              onClick={() => {
                                handleCheckout(true);
                              }}
                              className="get-start-btn"
                            >
                              {billingClick ? 'Please Wait...' : '30 Day Trial'}
                            </Button>
                          ) : null}

                          <Button
                            color="primary"
                            className="get-start-btn mt-4"
                            onClick={() => {
                              handleCheckout(false);
                            }}
                          >
                            {billingClick ? 'Please Wait...' : 'Checkout'}
                          </Button>
                        </>
                      )
                    ) : (
                      <>
                        <Button
                          color="primary"
                          onClick={handleChangeSubcription}
                          disabled={isUpdatingSitePlan}
                        >
                          {isUpdatingSitePlan
                            ? t('Common.text.please_wait')
                            : t('Profile.text.change_sub')}
                        </Button>
                        {sitePlanData?.getPlanBySiteIdAndUserId ? (
                          <Button
                            color="primary"
                            onClick={handleBilling}
                            disabled={clicked}
                            className="mt-2"
                          >
                            {clicked ? 'redirecting...' : 'Manage billing'}
                          </Button>
                        ) : null}
                      </>
                    )}
                  </div>
                )}

                {errorCreate?.message && (
                  <ErrorText message={errorCreate.message} />
                )}

                {errorUpdate?.message && (
                  <ErrorText message={errorUpdate.message} />
                )}
                {errorDelete?.message && (
                  <ErrorText message={errorDelete.message} />
                )}
              </div>
            )}
          </div>
          <div className="block w-full mb-4">
            <label
              className="font-bold text-[12px] leading-[15px] tracking-[2px] text-white-blue mix-blend-normal opacity-90 block uppercase mb-[19px]"
              htmlFor="coupon_code"
            >
              App Sumo {t('Coupon Code')}
            </label>
            {validatedCoupons.length > 0 && (
              <div className="mb-2">
                {validatedCoupons.map((code, index) => (
                  <span
                    key={index}
                    className="inline-block bg-green-200 text-green-800 text-sm font-semibold mr-2 px-2.5 py-0.5 rounded"
                  >
                    {code}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center">
              <input
                type="text"
                value={coupon}
                placeholder="Coupon Code"
                onChange={(e) => setCoupon(e.target.value)}
                className="p-[10px] py-[11.6px] bg-light-gray border border-solid border-white-blue rounded-[10px] text-[16px] leading-[19px] text-white-gray w-full box-border"
              />
              
              <button
              disabled={couponClicked}
                type="button"
                onClick={handleCouponValidation}
                className=" bg-primary flex justify-center py-[10.9px] px-3 text-white rounded-lg w-40 mx-3"
              >
                {couponClicked ? (<CircularProgress sx={{color:"white"}} size={20} />):validatedCoupons.length ? 'Add More' : (t('Apply Coupon'))}
                
              </button>
            </div>
          </div>
          <Plans
            plans={
              currentPlan.isTrial
                ? plans
                : Object.keys(currentPlan).length == 0 &&
                  currentActivePlan != ''
                // ? plans.filter((plan) => plan.id == currentActivePlan)
                ? plans
                : plans
            }
            onChange={changePlan}
            planChanged={planChanged}
            isYearly={isYearly}
            setisYearly={setIsYearly}
            checkIsCurrentPlan={checkIsCurrentPlan}
            handleBilling={handleBilling}
            showPlans={setShowPlans}
          />
          
        </div>
        <div></div>
      </div>
    </div>
  );
}

export default PlanSetting;
