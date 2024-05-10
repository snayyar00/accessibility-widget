import React, { useState, useEffect } from 'react';
import isEmpty from 'lodash/isEmpty';
import { useLazyQuery, useMutation } from '@apollo/client';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { useTranslation, Trans } from 'react-i18next';

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

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

const plans = [
  {
    id: 'free',
    name: 'Free Plan',
    price: 0,
    desc: 'For Website under 500 Impressions per month.',
    features: [
      'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
      'Accessbility Statement',
      'AI powered Screen Reader and Accessbility Profiles',
      'Web Ability accesbility Statement',
    ]
  },
  {
    id: 'small',
    name: 'Small Business',
    price: 15,
    desc: 'For Website under 1000 Impressions per month.',
    features: [
      'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
      'Accessbility Statement',
      'AI powered Screen Reader and Accessbility Profiles',
      'Web Ability accesbility Statement',
    ]
  },
  {
    id: 'medium',
    name: 'Medium Business',
    price: 45,
    desc: 'For Website under 10,000 Impressions per month.',
    features: [
      'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
      'Accessbility Statement',
      'AI powered Screen Reader and Accessbility Profiles',
      'Web Ability accesbility Statement',
    ]
  },
  {
    id: 'large',
    name: 'Enterprise',
    price: 75,
    desc: 'For Website under 100,000 Impressions per month.',
    features: [
      'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
      'Accessbility Statement',
      'AI powered Screen Reader and Accessbility Profiles',
      'Web Ability accesbility Statement',
    ]
  },
];

const PlanSetting: React.FC<{
  domain: TDomain,
  setReloadSites: (value: boolean) => void
}> = ({ domain, setReloadSites }) => {
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

  useEffect(() => {
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
  }

  async function createPaymentMethodSuccess(token: string) {
    if (!planChanged) return;
    const data = {
      paymentMethodToken: token,
      planName: planChanged.id,
      billingType: isYearly ? 'YEARLY' : 'MONTHLY',
      siteId: domain.id
    }
    await createSitePlanMutation({
      variables: data
    });
    setReloadSites(true);
    fetchSitePlan({
      variables: { siteId }
    });
  }

  async function handleChangeSubcription() {
    if (!planChanged) return;
    await updateSitePlanMutation({
      variables: {
        sitesPlanId: currentPlan.id,
        planName: planChanged.id,
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
    const url = 'https://api.webability.io/create-customer-portal-session';
    const bodyData = { id: sitePlanData?.getPlanBySiteIdAndUserId?.customerId };
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

  const planChanged = plans.find((item: any) => item.id === selectedPlan);
  const amountCurrent = currentPlan.amount || 0;
  const amountNew = planChanged ? planChanged.price : 0;
  return (
    <div className="bg-white border border-solid border-dark-grey shadow-xxl rounded-[10px] p-6 mb-[25px] sm:px-[10px] sm:py-6">
      <h5 className="font-bold text-[22px] leading-[30px] text-sapphire-blue mb-1">
        {t('Profile.text.plan')}
      </h5>
      <p className="text-[16px] leading-[26px] text-white-gray mb-[14px]">
        {t('Profile.text.plan_desc')}
      </p>
      <div className="flex justify-between sm:flex-col-reverse">
        <div>
          {sitePlanData?.getPlanBySiteIdAndUserId ? (<div className="flex items-center mt-2">
            <button className="submit-btn focus:outline-none focus:ring" onClick={handleBilling} disabled={clicked}>{clicked ? ("redirecting...") : ("Manage billing")}</button>
          </div>) : (null)}
          <div className="flex justify-center mb-[25px] sm:mt-[25px] [&_label]:mx-auto [&_label]:my-0">
            <Toggle onChange={toggle} label="Bill Yearly" />
          </div>
          <Plans
            plans={plans}
            onChange={changePlan}
            planChanged={planChanged}
            isYearly={isYearly}
            checkIsCurrentPlan={checkIsCurrentPlan}
          />
        </div>
        <div>
          {planChanged && (
            <div className="pl-6 pt-[74px] flex sm:p-0 sm:flex-col-reverse">
              {checkIsCurrentPlan(planChanged.id) ? (
                <div className="min-w-[300px] [&_button]:w-full">
                  {currentPlan.deletedAt ? (
                    <p>Plan will expire on <b>{dayjs(currentPlan.expiredAt).format('YYYY-MM-DD HH:mm')}</b>
                      <Trans
                        components={[<b></b>]}
                        values={{ data: dayjs(currentPlan.expiredAt).format('YYYY-MM-DD HH:mm') }}
                      >
                        {t('Profile.text.expire')}
                      </Trans>
                    </p>
                  ) : (
                    <Button
                      color="primary"
                      disabled={isDeletingSitePlan}
                      onClick={handleCancelSubscription}
                    >{t('Profile.text.cancel_sub')}</Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col min-w-[300px]">
                  <div className="font-bold text-[22px] leading-[30px] text-sapphire-blue mb-6">{t('Profile.text.order_sumary')}</div>
                  <ul className="flex-grow">
                    <li className="flex justify-between items-center list-none mb-4">
                      <p className="text-[16px] leading-[26px] text-white-gray flex-grow">{t('Profile.text.curreny_sub')}</p>
                      <span className="font-bold text-[18px] leading-6 text-sapphire-blue">${amountCurrent}</span>
                    </li>
                    <li className="flex justify-between items-center list-none mb-4">
                      <p className="text-[16px] leading-[26px] text-white-gray flex-grow">{t('Profile.text.new_sub')}</p>
                      <span className="font-bold text-[18px] leading-6 text-sapphire-blue">${isYearly ? amountNew * 9 : amountNew}</span>
                    </li>
                    <li className="flex justify-between items-center list-none mb-4">
                      <p className="text-[16px] leading-[26px] text-white-gray flex-grow">{t('Profile.text.balance_due')}</p>
                      <span className="font-bold text-[18px] leading-6 text-sapphire-blue">${Math.max((isYearly ? amountNew * 9 : amountNew) - amountCurrent, 0)}</span>
                    </li>
                  </ul>
                  {(isEmpty(currentPlan) || (currentPlan && currentPlan.deletedAt)) ? (
                    <StripeContainer
                      onSubmitSuccess={createPaymentMethodSuccess}
                      apiLoading={isCreatingSitePlan}
                      submitText={currentPlan && currentPlan.deletedAt && t('Profile.text.change_plan') as string}
                    />
                  ) : (
                    <Button
                      color="primary"
                      onClick={handleChangeSubcription}
                      disabled={isUpdatingSitePlan}
                    >{isUpdatingSitePlan ? t('Common.text.please_wait') : t('Profile.text.change_sub')}</Button>
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
      </div>
    </div>
  );
}

export default PlanSetting;
