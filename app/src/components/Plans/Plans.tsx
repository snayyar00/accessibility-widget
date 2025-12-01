import React, { Dispatch, SetStateAction, useState, useEffect } from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ReactComponent as CheckCircleIcon } from '@/assets/images/svg/check-circle.svg';
import Button from '../Common/Button';
import { useSelector } from 'react-redux';
import { RootState } from '../../config/store';
import { APP_SUMO_BUNDLE_NAMES } from '@/constants';
import { Tab, Tabs } from '@mui/material';
import { FaCalendarDays } from 'react-icons/fa6';

// const PlanWrapper = styled.div<{ active: boolean }>`
//   width: 430px;
//   display: flex;
//   flex-direction: column;
//   border: 1px solid #7c88b1;
//   border-radius: 10px;
//   padding: 24px;
//   cursor: pointer;

//   &:first-child {
//     margin-right: 25px;
//     ${mobileQuery} {
//       margin-right: 0;
//     }
//   }

//   ${mobileQuery} {
//     width: 100%;
//     max-width: 100%;
//     margin-right: 0;
//     margin-bottom: 15px;
//   }

//   ${(props) =>
//     props.active &&
//     css`
//       background: ${COLORS.PRIMARY};
//       border-color: rgba(255, 255, 255, 0.2);

//       ${Name}, ${Desc}, ${Price}, ${Unit}, ${FeatureText}, ${GetStartedBtn} {
//         color: ${COLORS.WHITE};
//       }

//       ${Desc} {
//         opacity: 0.7;
//       }

//       ${FeatureList} {
//         border-color: rgba(255, 255, 255, 0.2);
//       }

//       ${FeatureItem} {
//         svg {
//           circle,
//           path {
//             stroke: #8dead2;
//           }
//         }
//       }

//       ${GetStartedBtn} {
//         border-color: ${COLORS.WHITE};
//         background: ${COLORS.PRIMARY};
//       }
//     `}
// `;

type Plans = {
  id: string;
  name: string;
  price: number;
  desc: string;
  features: string[];
};

type Props = {
  plans: Plans[];
  onChange: (name: string) => void;
  checkIsCurrentPlan: (id: string) => boolean;
  planChanged?: Plans;
  isYearly: boolean;
  setisYearly: (isyearly: boolean) => void;
  handleBilling: () => void;
  showPlans: Dispatch<SetStateAction<boolean>>;
  billingButtons: any;
  activeSites: any;
  validatedCoupons: any;
  appSumoCount: any;
  infinityToken: any;
};

const Plans: React.FC<Props> = ({
  plans,
  onChange,
  planChanged,
  isYearly,
  setisYearly,
  checkIsCurrentPlan,
  handleBilling,
  showPlans,
  billingButtons,
  activeSites,
  validatedCoupons,
  appSumoCount,
  infinityToken,
}) => {
  const { t } = useTranslation();
  const currentPlan = plans.find((plan) => checkIsCurrentPlan(plan.id));
  const { data: subscribedPlan } = useSelector(
    (state: RootState) => state.sitePlan,
  );
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );

  const [rewardfulDiscount, setRewardfulDiscount] = useState<{
    valid: boolean;
    percentOff: number | null;
    amountOff: number | null;
    name?: string;
  }>({ valid: false, percentOff: null, amountOff: null });

  const [hasReferral, setHasReferral] = useState(false);

  // Check for Rewardful referral and fetch discount
  useEffect(() => {
    const checkReferral = () => {
      // Check if user came from a referral link
      const referralId = (window as any).Rewardful?.referral || null;
      setHasReferral(!!referralId);

      if (referralId) {
        // Fetch the discount information
        fetch(`${process.env.REACT_APP_BACKEND_URL}/rewardful-discount`)
          .then((response) => response.json())
          .then((data) => {
            if (data.valid) {
              setRewardfulDiscount(data);
              console.log('[REWARDFUL] Discount loaded:', data);
            }
          })
          .catch((error) => {
            console.error('[REWARDFUL] Failed to fetch discount:', error);
          });
      }
    };

    checkReferral();
  }, []);

  // Helper function to calculate discounted price
  const calculateDiscountedPrice = (basePrice: number): number => {
    if (!hasReferral || !rewardfulDiscount.valid) {
      return basePrice;
    }

    if (rewardfulDiscount.percentOff) {
      return basePrice * (1 - rewardfulDiscount.percentOff / 100);
    }

    if (rewardfulDiscount.amountOff) {
      return Math.max(0, basePrice - rewardfulDiscount.amountOff);
    }

    return basePrice;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: boolean) => {
    setisYearly(newValue);
  };

  let maxSites = appSumoCount * 2 || 2;
  let appSumoPlan = 'Professional';

  if (appSumoCount <= 1) {
    appSumoPlan = 'Starter';
  } else if (appSumoCount <= 3) {
    appSumoPlan = 'Medium';
  } else {
    appSumoPlan = 'Enterprise';
  }
  return (
    <div className="plan-selection-area flex flex-wrap sm:flex-col justify-center gap-4">
      {currentPlan ? (
        <div
          // onClick={() => onChange(String(currentPlan?.id))}
          key={currentPlan?.id}
          role="presentation"
          className={classNames(
            'flex flex-col w-[400px] border border-solid border-dark-gray rounded-[10px] p-6 cursor-pointer sm:w-full sm:max-w-full',
            {
              'plan-wrapper': planChanged
                ? currentPlan?.id === planChanged.id
                : false,
            },
          )}
        >
          <h5 className="font-medium text-[14px] leading-[17px] text-sapphire-blue mb-[6px] name">
            {currentPlan?.name}
          </h5>
          <p className="desc text-[12px] leading-4 text-white-blue">
            {currentPlan?.desc}
          </p>
          <div className="flex items-end mx-0 my-6">
            <span className="price font-bold text-[32px] leading-9 text-green">
              $
              {isYearly
                ? currentPlan.name == 'Enterprise'
                  ? Number(currentPlan?.price) * 10
                  : Number(currentPlan?.price) * 10
                : currentPlan?.price}
            </span>
            <span className="unit text-[12px] leading-[25px] text-white-gray opacity-90">
              /
              {!APP_SUMO_BUNDLE_NAMES.includes(currentPlan.id)
                ? isYearly
                  ? 'year'
                  : 'month'
                : 'Lifetime'}
            </span>
          </div>
          <ul className="feature-list pt-6 pb-8 border-t border-solid border-dark-gray flex-grow">
            {currentPlan?.features.map((feature) => (
              <li
                key={feature}
                className="feature-item list-none flex items-center [&+&]:mt-2"
              >
                <span className="w-4 h-4">
                  <CheckCircleIcon />
                </span>
                <span className="feature-text text-[14px] leading-6 text-white-gray ml-3">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
          <Button className="get-start-btn w-full mt-2" onClick={handleBilling}>
            Manage Billing
          </Button>
          <Button
            className="get-start-btn w-full mt-2"
            onClick={() => {
              onChange(String(currentPlan?.id));
              showPlans(true);
            }}
          >
            Update/Cancel Plan
          </Button>
        </div>
      ) : null}
      {organization?.id === '1' && (validatedCoupons.length > 0 ||
      (appSumoCount !== 0 && maxSites > activeSites))
        ? (planChanged ||
            Object.keys(subscribedPlan).length == 0 ||
            subscribedPlan.isTrial) &&
          [plans[0]].map((plan) => {
            // {(planChanged || (Object.keys(subscribedPlan).length == 0) || subscribedPlan.productType != subPlan ) && (plans.map((plan) =>{
            if (checkIsCurrentPlan(plan.id)) {
              return null;
            } else {
              onChange(plan.id);
            }
            // if(currentPlan == undefined && subPlan !== undefined && plan?.id !== subPlan?.id )
            // {
            //   return null
            // }
            return (
              <div
                onClick={() => {
                  onChange(plan.id);
                }}
                key={plan.id}
                role="presentation"
                className={classNames(
                  'flex flex-col w-fit border border-solid border-dark-gray rounded-[10px] p-6 sm:w-full sm:max-w-full',
                  {
                    'plan-wrapper': false,
                  },
                )}
              >
                <h5 className="font-bold text-xl text-center leading-[17px] text-sapphire-blue mb-4 name">
                  {infinityToken
                    ? 'Agency Unlimited Plan'
                    : maxSites >= 100
                    ? 'Agency Growth Plan'
                    : maxSites >= 50
                    ? 'Agency Starter Plan'
                    : `App Sumo ${appSumoPlan}`}
                </h5>
                <p className="desc text-center text-[12px] mb-3 leading-4 text-white-blue">
                  Ideal for all your accessibility needs
                </p>

                <p className="desc text-md font-bold leading-4 text-sapphire-blue">
                  Sites Used
                </p>
                <div className="flex justify-between mx-0 my-6 px-4">
                  <span className="price font-bold text-[32px] leading-9 text-sapphire-blue">
                    {activeSites} /{' '}
                    {infinityToken
                      ? '∞'
                      : maxSites +
                        (appSumoCount == 0
                          ? validatedCoupons.length - 1
                          : validatedCoupons.length) *
                          2}
                  </span>
                  <div className="flex justify-end items-end">
                    <span className="price font-bold text-[32px] leading-9 text-sapphire-blue">
                      $0
                    </span>
                    <span className="unit text-[12px] leading-[25px] text-white-gray opacity-90">
                      /{'month'}
                    </span>
                  </div>
                </div>
                <ul className="feature-list pt-6 pb-8 border-t border-solid border-dark-gray flex-grow no-scrollbar">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="feature-item list-none flex items-center [&+&]:mt-2"
                    >
                      <span className="w-4 h-4">
                        <CheckCircleIcon />
                      </span>
                      <span className="feature-text text-[14px] leading-6 text-white-gray ml-3">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                {billingButtons}
              </div>
            );
          })
        : (planChanged ||
            Object.keys(subscribedPlan).length == 0 ||
            subscribedPlan.isTrial) &&
          [plans[0]].map((plan) => {
            // {(planChanged || (Object.keys(subscribedPlan).length == 0) || subscribedPlan.productType != subPlan ) && (plans.map((plan) =>{
            if (checkIsCurrentPlan(plan.id)) {
              return null;
            } else {
              onChange(plan.id);
            }
            // if(currentPlan == undefined && subPlan !== undefined && plan?.id !== subPlan?.id )
            // {
            //   return null
            // }
            return (
              <div
                onClick={() => {
                  onChange(plan.id);
                }}
                key={plan.id}
                role="presentation"
                className={classNames(
                  'flex flex-col w-fit border border-solid border-dark-gray rounded-[10px] p-6 sm:w-full sm:max-w-full',
                  {
                    'plan-wrapper': false,
                  },
                )}
              >
                <h5 className="font-bold text-xl text-center leading-[17px] text-sapphire-blue mb-4 name">
                  {plan.name}
                </h5>
                <p className="desc text-center text-[12px] mb-3 leading-4 text-white-blue">
                  {plan.desc}
                </p>
                <Tabs
                  value={isYearly}
                  onChange={handleTabChange}
                  variant="fullWidth"
                  className="mb-1"
                  TabIndicatorProps={{
                    style: { display: 'none' },
                  }}
                  sx={{
                    '& .MuiTabs-flexContainer': {
                      borderRadius: '0.5rem',
                      backgroundColor: 'rgb(243 244 246)',
                      padding: '0.25rem',
                    },
                    '& .Mui-selected': {
                      backgroundColor: 'white',
                      borderRadius: '0.375rem',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      color: '#242f57',
                    },
                    '& .MuiTab-root': {
                      textTransform: 'none',
                      minHeight: '2.5rem',
                      fontWeight: '500',
                      fontSize: '0.875rem',
                    },
                  }}
                >
                  <Tab
                    value={false}
                    label={
                      <div className="flex items-center gap-1">
                        <FaCalendarDays className="h-4 w-4" />
                        <span>Monthly</span>
                      </div>
                    }
                  />
                  <Tab
                    value={true}
                    label={
                      <div className="flex items-center gap-1">
                        <FaCalendarDays className="h-4 w-4" />
                        <span>Yearly</span>
                      </div>
                    }
                  />
                </Tabs>
                <p className="desc text-right text-[12px] mb-3 leading-4 pr-2 text-primary">
                  2 months Free
                </p>
                <p className="desc text-md font-bold leading-4 text-sapphire-blue">
                  Sites per month
                </p>
                <div className="flex justify-between mx-0 my-6 px-4">
                  <span className="price font-bold text-[32px] leading-9 text-sapphire-blue">
                    1
                  </span>
                  <div className="flex flex-col justify-end items-end">
                    <span className="price font-bold text-[32px] leading-9 text-sapphire-blue">
                      {isYearly && (
                        <span className="line-through mr-3 text-light-grey">
                          ${plan.price}
                        </span>
                      )}
                      {hasReferral && rewardfulDiscount.valid ? (
                        <>
                          <span className="line-through mr-2 text-light-grey text-[24px]">
                            ${isYearly ? plan.price - 2 : plan.price}
                          </span>
                          $
                          {calculateDiscountedPrice(
                            isYearly ? plan.price - 2 : plan.price,
                          ).toFixed(2)}
                        </>
                      ) : (
                        `$${isYearly ? plan.price - 2 : plan.price}`
                      )}
                    </span>
                    <span className="unit text-[12px] leading-[25px] text-white-gray opacity-90">
                      /{'month'}
                    </span>
                    {hasReferral && rewardfulDiscount.valid && (
                      <span className="text-[10px] text-green-600 font-semibold mt-1">
                        {rewardfulDiscount.percentOff
                          ? `${rewardfulDiscount.percentOff}% Referral Discount Applied!`
                          : `$${rewardfulDiscount.amountOff} Referral Discount Applied!`}
                      </span>
                    )}
                  </div>
                </div>
                <ul className="feature-list pt-6 pb-8 border-t border-solid border-dark-gray flex-grow no-scrollbar">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="feature-item list-none flex items-center [&+&]:mt-2"
                    >
                      <span className="w-4 h-4">
                        <CheckCircleIcon />
                      </span>
                      <span className="feature-text text-[14px] leading-6 text-white-gray ml-3">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                {billingButtons}
              </div>
            );
          })}
    </div>
  );
};
export default Plans;
