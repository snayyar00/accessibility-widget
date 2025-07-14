import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import StripeForm from '@/components/Stripe/StripeForm';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

type Props = {
  onSubmitSuccess: (token: string) => void;
  className?: string;
  onGoBack?: () => void;
  apiLoading: boolean;
  apiError?: string;
  submitText?: string;
  setCoupon: (newValue: string) => void;
  setDiscount: (newValue: number) => void;
  setpercentDiscount: (newValue: boolean) => void;
}

const StripeContainer: React.FC<Props> = ({
  onSubmitSuccess,
  className,
  onGoBack,
  apiLoading,
  apiError,
  submitText,
  setCoupon,
  setDiscount,
  setpercentDiscount,
}) => (
  <Elements stripe={stripePromise}>
    <StripeForm
      onSubmitSuccess={onSubmitSuccess}
      className={className}
      onGoBack={onGoBack}
      apiLoading={apiLoading}
      apiError={apiError}
      submitText={submitText}
      setCoupon={setCoupon}
      setDiscount={setDiscount}
      setpercentDiscount={setpercentDiscount}
    />
  </Elements>
);

export default StripeContainer;