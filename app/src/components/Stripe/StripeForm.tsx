import React, { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from '@stripe/react-stripe-js';
import Button from '@/components/Common/Button';

type Props = {
  onSubmitSuccess: (token: string) => void;
  className?: string;
  onGoBack?: () => void;
  submitText?: string;
  apiLoading: boolean;
  apiError?: string;
  setCoupon: (newValue: string) => void;
  setDiscount: (newValue: number) => void; 
  setpercentDiscount: (newValue: boolean) => void;
}

const StripeForm: React.FC<Props> = ({
  onSubmitSuccess,
  className,
  onGoBack,
  apiLoading,
  apiError = "",
  submitText = 'Submit',
  setCoupon,
  setDiscount,
  setpercentDiscount,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [discountVal, setDiscountVal] = useState<number | null>(null);
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    setIsSubmitting(apiLoading);
  }, [apiLoading]);

  useEffect(() => {
    setError(apiError);
  }, [apiError]);

  const validateCouponCode = async () => {
    setCouponError('');
    setDiscountVal(null);
    try {
      const response = await fetch('http://localhost:5000/validate-coupon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ couponCode }),
      });
      const data = await response.json();
      if (data.valid) {
        setCoupon(data.id);
        setDiscount(Number(data.discount));
        if(data.percent)
        {
          setpercentDiscount(true);
        }
        setDiscountVal(data.discount)
      } else {
        console.log("Error = ",data.error)
        setCouponError(data.error || 'Invalid coupon code');
      }
    } catch (error) {
      console.log("catch error=",error);
      setCouponError('Error validating coupon code');
    }
  };

  const onSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (elements && stripe) {
        const card = elements.getElement(CardNumberElement);
        let result;
        if (card) result = await stripe.createToken(card); 
        if (result?.error) {
          setError(result.error?.code ?? "");
        } else {
          onSubmitSuccess(result?.token?.id ?? "");
        }
      }
    } catch (err: any) {
      setError(err.toString());
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className={`w-[300px] ${className}`}>
      <div>
        {onGoBack && <Button type="button" onClick={onGoBack} className="border-transparent p-0 mb-5 cursor-pointer [&>svg]:text-red [&>svg]:w-5" />}
        <div>
          <div className="block w-full mb-4">
            <label className="font-bold text-[12px] leading-[15px] tracking-[2px] text-white-blue mix-blend-normal opacity-90 block uppercase mb-[19px]" htmlFor="street_address">
              {t('Payment.label.card')}
            </label>
            <CardNumberElement className="card-el p-[10px] py-[11.6px] bg-light-gray border border-solid border-white-blue rounded-[10px] text-[16px] leading-[19px] text-center text-white-gray box-border" />
          </div>
          <div className="flex items-center justify-between">
            <div className="block w-full mb-4 mr-[10px]">
              <label className="font-bold text-[12px] leading-[15px] tracking-[2px] text-white-blue mix-blend-normal opacity-90 block uppercase mb-[19px]" htmlFor="first_name">
                {t('Payment.label.expiration')}
              </label>
              <CardExpiryElement className="px-[10px] py-[11.6px] bg-light-gray border border-solid border-white-blue rounded-[10px] text-[16px] leading-[19px] text-center text-white-gray w-full box-border" />
            </div>
            <div className="block w-full mb-4 ml-[10px]">
              <label className="font-bold text-[12px] leading-[15px] tracking-[2px] text-white-blue mix-blend-normal opacity-90 block uppercase mb-[19px]" htmlFor="last_name">
                {t('Payment.label.cvc')}
              </label>
              <CardCvcElement className="px-[10px] py-[11.6px] bg-light-gray border border-solid border-white-blue rounded-[10px] text-[16px] leading-[19px] text-center text-white-gray w-full box-border" />
            </div>
          </div>
        </div>
      </div>
      <div className="block w-full mb-4">
        <label className="font-bold text-[12px] leading-[15px] tracking-[2px] text-white-blue mix-blend-normal opacity-90 block uppercase mb-[19px]" htmlFor="coupon_code">
          {t('Coupon Code')}
        </label>
        <div className="flex items-center">
        <input
          type="text"
          value={couponCode}
          placeholder='Coupon Code'
          onChange={(e) => setCouponCode(e.target.value)}
          className="p-[10px] py-[11.6px] bg-light-gray border border-solid border-white-blue rounded-[10px] text-[16px] leading-[19px] text-white-gray w-full box-border"
        />
        <Button type="button" onClick={validateCouponCode} className="mx-3">
          {t('Apply Coupon')}
        </Button>
        </div>
        
        {couponError && (
          <p className="text-red-500 text-xs italic mt-1 text-center">{couponError}</p>
        )}
        {discountVal !== null && (
          <p className="text-green-500 text-xs italic mt-1 text-center">
            {t('Coupon Code Applied')}
          </p>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-xs italic mt-1 text-center">{t(`Sign_up.error.${error}`)}</p>
      )}
      <Button
        type="submit"
        disabled={isSubmitting}
        color="primary"
        width="100%"
        className="w-full"
      >
        {isSubmitting ? t('Common.text.please_wait') : (submitText ?? t('Common.text.submit'))}
      </Button>
    </form>
  );
};

export default memo(StripeForm);
