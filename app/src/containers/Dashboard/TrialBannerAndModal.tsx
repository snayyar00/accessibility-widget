import React, { FormEvent, useEffect, useState } from 'react'
import BannerImage from "@/assets/images/WebAbility Hero3.png"
import SingleBannerImage from "@/assets/images/WebAbilityBanner.png"
import { ReactComponent as LogoIcon } from '@/assets/images/svg/logo.svg';
import { useMutation } from '@apollo/client';
import addSite from '@/queries/sites/addSite';
import { toast } from 'react-toastify';
import isValidDomain from '@/utils/verifyDomain';
import PlanSetting from '../SiteDetail/PlanSetting';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import classNames from 'classnames';
import { APP_SUMO_BUNDLE_NAME } from '@/constants';


interface ModalProps {
    isOpen: boolean;
    paymentView: boolean;
    onClose: () => void;
    children: React.ReactNode;
    optionalDomain:any;
    isStripeCustomer:boolean;
    domainCount:number;
}

interface DomainFormData {
    domainName: string;
}

const Modal: React.FC<ModalProps> = ({ isStripeCustomer,isOpen, onClose, children, paymentView,optionalDomain,domainCount }) => {
    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50`}
        >
            <div className="bg-white rounded-lg w-3/4 overflow-y-auto max-h-[95vh]">
                <div className="grid grid-cols-12 justify-evenly">
                    <div className='sm:col-span-9 col-span-6 pl-4 pt-2'>
                        <LogoIcon />
                    </div>
                    <div className={`sm:col-span-3 col-span-6 pt-2 pr-4 text-end rounded-tr-lg sm:bg-white ${paymentView?'':'bg-[#0033ed]'}`}>
                        <button className={`sm:text-black text-${paymentView ? "black" : "white"} text-3xl hover:text-gray-700`} onClick={onClose}>
                            ×
                        </button>
                    </div>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
}

export type TDomain = {
    id: string;
    url: string;
    __typename: string;
    trial?: number;
}

const TrialBannerAndModal: React.FC<any> = ({allDomains,setReloadSites,isModalOpen,closeModal,openModal,paymentView,setPaymentView,optionalDomain}:any) => {

    const { data: userData, loading: userLoading } = useSelector((state: RootState) => state.user);
    const [isStripeCustomer, setIsStripeCustomer] = useState(false);
    const [activePlan, setActivePlan] = useState("");
    const [isYearly, setIsYearly] = useState(false);
    const [billingLoading, setBillingLoading] = useState(false);
    const [domainName, setDomainName] = useState(optionalDomain ? optionalDomain : "");
    const [addedDomain, setAddedDomain] = useState<TDomain>({ id: "", url: "", __typename: "" });
    const [domainCount,setDomainCount] = useState(0);

    const showPaymentModal = async () => {
        if (!isValidDomain(formData.domainName)) {
            toast.error('You must enter a valid domain name!');
            return;
        }
        // const sanitizedDomain = formData.domainName.replace(/^(https?:\/\/)/, '');
        const sanitizedDomain = formData.domainName.replace(/^(https?:\/\/)?(www\.)?/, '');
        const response = await addSiteMutation({ variables: { url: sanitizedDomain } });
        if(response.errors)
        {
            toast.error('The domain is already in use');
        }
        else{
            toast.success('The domain was successfully added. Please Wait');
            setDomainName(sanitizedDomain);
            setBillingLoading(true);
        }
    };


    useEffect( () => {
        if (addedDomain?.url !== "" && paymentView !== true) {
            if (activePlan !== "") {
                let res = async ()=>{
                    await handleSubscription();
                    window.location.href = '/add-domain';
                } 
                res();
            }
            else {
                setPaymentView(true);
            }
        }
    }, [addedDomain])

    useEffect(() => {
        if (allDomains) {
            if (domainName) {
                const newdomain = allDomains.getUserSites.filter((site: any) => site.url == domainName)[0];
                setDomainCount(allDomains.getUserSites.length);
                if (newdomain) {
                    setAddedDomain(newdomain);
                }
            }
        }
    }, [allDomains])

    useEffect(() => {
        if (allDomains) {
            const newdomain = allDomains.getUserSites.filter((site: any) => site.url == optionalDomain)[0];
            setDomainCount(allDomains.getUserSites.length);
            if (newdomain) {
                setAddedDomain(newdomain);
            }
        }
    }, [optionalDomain])

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
                        setIsStripeCustomer(true);
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

    const handleSubscription = async () => {
        setBillingLoading(true);
        let url = `${process.env.REACT_APP_BACKEND_URL}/create-subscription`;
        const bodyData = { email: userData.email, returnURL: window.location.href, planName: activePlan, billingInterval: isYearly || activePlan.toLowerCase() == APP_SUMO_BUNDLE_NAME ? "YEARLY" : "MONTHLY", domainId: addedDomain.id, domainUrl: addedDomain.url, userId: userData.id };
        
        if(activePlan.toLowerCase() == APP_SUMO_BUNDLE_NAME)
        {
            url = `${process.env.REACT_APP_BACKEND_URL}/create-appsumo-subscription`
        }
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
                        closeModal();
                        setPaymentView(false);
                        window.location.reload();
                    });
                })
                .catch(error => {
                    // Handle error
                    toast.error('You have reached the maximum number of allowed domains for this plan');
                    console.error('There was a problem with the fetch operation:', error);
                    setBillingLoading(false);
                    setPaymentView(false);
                    closeModal();
                });
        } catch (error) {
            console.log("error", error);
        }

    }

    useEffect(()=>{
    customerCheck();
    },[])

    const [formData, setFormData] = useState<DomainFormData>({ domainName: '' });

    const [addSiteMutation, { error: addSiteError, loading: addSiteLoading }] = useMutation(addSite, {
        onCompleted: () => {
            setReloadSites(true);
        },
        onError:()=>{
            setReloadSites(true);
        }
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (!isValidDomain(formData.domainName)) {
            toast.error('You must enter a valid domain name!');
            return;
        }
        // const sanitizedDomain = formData.domainName.replace(/^(https?:\/\/)/, '');
        const sanitizedDomain = formData.domainName.replace(/^(https?:\/\/)?(www\.)?/, '');
        const response = await addSiteMutation({ variables: { url: sanitizedDomain } });
        if(response.errors)
        {
            toast.error('The domain is already in use');
        }
        else{
            toast.success('The domain was added successfully. Please Wait');
            window.location.href = '/add-domain';
        }
    };
    return (
      <>
        <div>
          <Modal
            isStripeCustomer={isStripeCustomer}
            isOpen={isModalOpen}
            onClose={closeModal}
            paymentView={paymentView}
            optionalDomain={optionalDomain}
            domainCount={domainCount}
          >
            {paymentView ? (
              <PlanSetting
                key={domainName}
                domain={addedDomain}
                setReloadSites={setReloadSites}
              />
            ) : (
              <div className="grid grid-cols-12">
                <div className="sm:col-span-12 col-span-6 px-4 flex flex-col justify-between ">
                  <div className='flex flex-col gap-3'>
                    <h1 className="card-title text-2xl py-4">
                      Start a 7-day WebAbilityWidget trial!
                    </h1>
                    <p>
                      Streamline web accessibility with WebAbilityWidget, the #1
                      web accessibility, WCAG and ADA compliance solution
                    </p>
                    <div className="form-group">
                      <input
                        type="text"
                        id="domainName"
                        name="domainName"
                        placeholder="Add a new domain name"
                        value={formData.domainName}
                        onChange={handleInputChange}
                        className="form-control"
                        form="bannerForm"
                      />
                    </div>
                  </div>

                  <div className="add-domain-form-container py-4">
                    <form
                      id="bannerForm"
                      onSubmit={handleSubmit}
                      className="add-domain-form"
                    >
                      <div className="sm:flex-col md:flex-row flex justify-end pb-3 pt-4">
                        <button
                          type="button"
                          className="py-3 mr-4 text-white text-center rounded-xl bg-primary hover:bg-sapphire-blue w-[45%] sm:w-full transition duration-300"
                          onClick={showPaymentModal}
                          disabled={addSiteLoading || billingLoading}
                        >
                          {addSiteLoading || billingLoading
                            ? 'Please Wait...'
                            : activePlan !== ''
                            ? 'Skip trial & add to plan'
                            : 'Skip trial & buy'}
                        </button>

                        <button
                          disabled={addSiteLoading || billingLoading}
                          type="submit"
                          className="py-3 text-white text-center rounded-xl bg-primary hover:bg-sapphire-blue w-[45%] sm:my-4 sm:w-full transition duration-300"
                        >
                          {addSiteLoading || billingLoading
                            ? 'Please Wait...'
                            : 'Start free trial'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
                <div
                  className="sm:hidden col-span-6 px-4 flex justify-center rounded-br-lg bg-[#0033ED]"
                >
                  <div className="flex flex-col justify-center items-center">
                    <img
                      src={SingleBannerImage} // Replace with the actual URL of your image
                      alt="Accessibility Widget"
                      className="max-w-[70%] max-h-full shadow-lg"
                    />

                    <div className="py-3 text-white">
                      <div className="flex">
                        <i
                          role="presentation"
                          aria-hidden="true"
                          className="sc-brSamD froxNw"
                        >
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M19.208 2H4.79a.666.666 0 0 0-.547.28L.11 8.21a.608.608 0 0 0 .048.758L11.604 21.78a.677.677 0 0 0 1.003-.005L23.846 8.968a.608.608 0 0 0 .044-.754L19.756 2.28a.666.666 0 0 0-.548-.28Z"
                              fill="#683AEC"
                            ></path>
                            <path
                              d="m11.478 21.538-6.94-19.26c-.05-.136.056-.278.207-.278h14.51c.15 0 .256.14.209.276l-6.741 19.256c-.2.57-1.04.574-1.245.006Z"
                              fill="#906AFF"
                            ></path>
                            <path
                              d="M.31 8.606c-.187 0-.288.21-.166.346l11.46 12.828a.677.677 0 0 0 1.003-.005L23.861 8.951c.12-.136.018-.345-.168-.345H.31Z"
                              fill="url(#diamond_svg__a)"
                              fillOpacity="0.52"
                            ></path>
                            <defs>
                              <linearGradient
                                id="diamond_svg__a"
                                x1="11.999"
                                y1="8.606"
                                x2="11.999"
                                y2="22.344"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop stopColor="#4014BC"></stop>
                                <stop
                                  offset="1"
                                  stopColor="#4014BC"
                                  stopOpacity="0"
                                ></stop>
                              </linearGradient>
                            </defs>
                          </svg>
                        </i>
                        <p className="px-3">
                          Accessibility statement and certifications
                        </p>
                      </div>
                      <div className="flex">
                        <i
                          role="presentation"
                          aria-hidden="true"
                          className="sc-brSamD froxNw"
                        >
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M19.208 2H4.79a.666.666 0 0 0-.547.28L.11 8.21a.608.608 0 0 0 .048.758L11.604 21.78a.677.677 0 0 0 1.003-.005L23.846 8.968a.608.608 0 0 0 .044-.754L19.756 2.28a.666.666 0 0 0-.548-.28Z"
                              fill="#683AEC"
                            ></path>
                            <path
                              d="m11.478 21.538-6.94-19.26c-.05-.136.056-.278.207-.278h14.51c.15 0 .256.14.209.276l-6.741 19.256c-.2.57-1.04.574-1.245.006Z"
                              fill="#906AFF"
                            ></path>
                            <path
                              d="M.31 8.606c-.187 0-.288.21-.166.346l11.46 12.828a.677.677 0 0 0 1.003-.005L23.861 8.951c.12-.136.018-.345-.168-.345H.31Z"
                              fill="url(#diamond_svg__a)"
                              fillOpacity="0.52"
                            ></path>
                            <defs>
                              <linearGradient
                                id="diamond_svg__a"
                                x1="11.999"
                                y1="8.606"
                                x2="11.999"
                                y2="22.344"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop stopColor="#4014BC"></stop>
                                <stop
                                  offset="1"
                                  stopColor="#4014BC"
                                  stopOpacity="0"
                                ></stop>
                              </linearGradient>
                            </defs>
                          </svg>
                        </i>
                        <p className="px-3">
                          2-minute integration, immediate turnaround
                        </p>
                      </div>
                      <div className="flex">
                        <i
                          role="presentation"
                          aria-hidden="true"
                          className="sc-brSamD froxNw"
                        >
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M19.208 2H4.79a.666.666 0 0 0-.547.28L.11 8.21a.608.608 0 0 0 .048.758L11.604 21.78a.677.677 0 0 0 1.003-.005L23.846 8.968a.608.608 0 0 0 .044-.754L19.756 2.28a.666.666 0 0 0-.548-.28Z"
                              fill="#683AEC"
                            ></path>
                            <path
                              d="m11.478 21.538-6.94-19.26c-.05-.136.056-.278.207-.278h14.51c.15 0 .256.14.209.276l-6.741 19.256c-.2.57-1.04.574-1.245.006Z"
                              fill="#906AFF"
                            ></path>
                            <path
                              d="M.31 8.606c-.187 0-.288.21-.166.346l11.46 12.828a.677.677 0 0 0 1.003-.005L23.861 8.951c.12-.136.018-.345-.168-.345H.31Z"
                              fill="url(#diamond_svg__a)"
                              fillOpacity="0.52"
                            ></path>
                            <defs>
                              <linearGradient
                                id="diamond_svg__a"
                                x1="11.999"
                                y1="8.606"
                                x2="11.999"
                                y2="22.344"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop stopColor="#4014BC"></stop>
                                <stop
                                  offset="1"
                                  stopColor="#4014BC"
                                  stopOpacity="0"
                                ></stop>
                              </linearGradient>
                            </defs>
                          </svg>
                        </i>
                        <p className="px-3">
                          AI-Powered daily monitoring and scanning
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Modal>
        </div>
        <div
          className={`dashboard-card w-full ms:min-h-[310px] mm:min-h-[250px] md:min-h-[210px] lg:min-h-[310px] grid grid-cols-12 text-white outline outline-1`}
          style={{
            backgroundColor: 'rgb(0 51 237)',
            minWidth: '100%',
          }}
        >
          <div className="card-content sm:col-span-12 col-span-5">
            <div className="card-header">
              <h1 className="card-title text-2xl">
                Make your website accessible with WebAbility
              </h1>
            </div>
            <p className="my-5">
              Navigate ADA & WCAG Compliance with WebAbility.io's Accessibility
              Widget
            </p>
            <button
              className="mt-1 xl:mt-12 xxl:mt-24 py-3 text-white text-center rounded-xl bg-primary hover:bg-sapphire-blue w-full sm:my-4 sm:w-full transition duration-300"
              onClick={openModal}
            >
              <span className="font-medium ml-1">Start a 7-day Trial</span>
            </button>
          </div>

          <div className="sm:hidden col-span-7 flex items-start justify-center">
            <img
              src={BannerImage} // Replace with the actual URL of your image
              alt="Accessibility Widget"
              className="max-w-full max-h-[75%] pt-4"
            />
          </div>
        </div>
      </>
    );
}

export default TrialBannerAndModal