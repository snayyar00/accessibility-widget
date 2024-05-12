import React from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ReactComponent as CheckCircleIcon } from '@/assets/images/svg/check-circle.svg';
import Button from '../Common/Button';
import { useSelector } from 'react-redux';
import { RootState } from '../../config/store';

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
}

type Props = {
  plans: Plans[];
  onChange: (name: string) => void;
  checkIsCurrentPlan: (id: string) => boolean;
  planChanged?: Plans;
  isYearly: boolean;
  handleBilling:()=>void;
}

const Plans: React.FC<Props> = ({
  plans,
  onChange,
  planChanged,
  isYearly,
  checkIsCurrentPlan,
  handleBilling,
}) => {
  const { t } = useTranslation();
  const currentPlan = plans.find((plan) => checkIsCurrentPlan(plan.id));
  const { data: subscribedPlan } = useSelector((state: RootState) => state.sitePlan);
  return (
    <div className="flex flex-wrap sm:flex-col justify-center">
      {currentPlan ? (<div
          // onClick={() => onChange(String(currentPlan?.id))}
          key={currentPlan?.id}
          role="presentation"
          className={classNames("flex flex-col w-[400px] border border-solid border-dark-gray rounded-[10px] p-6 cursor-pointer m-2 sm:w-full sm:max-w-full sm:mr-0 sm:mb-[15px]", {
            "plan-wrapper": planChanged ? currentPlan?.id === planChanged.id : false
          })}
        >
          <h5 className="font-medium text-[14px] leading-[17px] text-sapphire-blue mb-[6px] name">{currentPlan?.name}</h5>
          <p className="desc text-[12px] leading-4 text-white-blue">{currentPlan?.desc}</p>
          <div className="flex items-end mx-0 my-6">
            <span className="price font-bold text-[32px] leading-9 text-green">${isYearly ? Number(currentPlan?.price) * 9 : currentPlan?.price}</span>
            <span className="unit text-[12px] leading-[25px] text-white-gray opacity-90">/{isYearly ? 'year' : 'month'}</span>
          </div>
          <ul className="feature-list pt-6 pb-8 border-t border-solid border-dark-gray flex-grow">
            {currentPlan?.features.map((feature) => (
              <li key={feature} className="feature-item list-none flex items-center [&+&]:mt-2">
                <span className="w-4 h-4">
                  <CheckCircleIcon />
                </span>
                <span className="feature-text text-[14px] leading-6 text-white-gray ml-3">{feature}</span>
              </li>
            ))}
          </ul>
          <Button className="get-start-btn w-full mt-2" onClick={handleBilling}>Manage Billing</Button>
          <Button className="get-start-btn w-full mt-2" onClick={() => onChange(String(currentPlan?.id))} >Update/Cancel Plan</Button>
        </div>):(null)}
      
      {(planChanged || (Object.keys(subscribedPlan).length == 0)) && (plans.map((plan) =>{ 
        if(checkIsCurrentPlan(plan.id))
        {
          return null;
        }
        return(
        <div
          onClick={() => onChange(plan.id)}
          key={plan.id}
          role="presentation"
          className={classNames("flex flex-col w-[400px] border border-solid border-dark-gray rounded-[10px] p-6 cursor-pointer m-2 sm:w-full sm:max-w-full sm:mr-0 sm:mb-[15px]", {
            "plan-wrapper": planChanged ? plan.id === planChanged.id : false
          })}
        >
          <h5 className="font-medium text-[14px] leading-[17px] text-sapphire-blue mb-[6px] name">{plan.name}</h5>
          <p className="desc text-[12px] leading-4 text-white-blue">{plan.desc}</p>
          <div className="flex items-end mx-0 my-6">
            <span className="price font-bold text-[32px] leading-9 text-green">${isYearly ? plan.price * 9 : plan.price}</span>
            <span className="unit text-[12px] leading-[25px] text-white-gray opacity-90">/{isYearly ? 'year' : 'month'}</span>
          </div>
          <ul className="feature-list pt-6 pb-8 border-t border-solid border-dark-gray flex-grow">
            {plan.features.map((feature) => (
              <li key={feature} className="feature-item list-none flex items-center [&+&]:mt-2">
                <span className="w-4 h-4">
                  <CheckCircleIcon />
                </span>
                <span className="feature-text text-[14px] leading-6 text-white-gray ml-3">{feature}</span>
              </li>
            ))}
          </ul>
          {checkIsCurrentPlan(plan.id) ? (
            <Button className="get-start-btn w-full">{t('Profile.text.current_plan')}</Button>
          ) : (
            <Button color="primary" className="get-start-btn w-full">{t('Profile.text.get_started')}</Button>
          )}
        </div>
      )}))}
      {/* {plans.map((plan) => (
        <div
          onClick={() => onChange(plan.id)}
          key={plan.id}
          role="presentation"
          className={classNames("flex flex-col w-[400px] border border-solid border-dark-gray rounded-[10px] p-6 cursor-pointer m-2 sm:w-full sm:max-w-full sm:mr-0 sm:mb-[15px]", {
            "plan-wrapper": planChanged ? plan.id === planChanged.id : false
          })}
        >
          <h5 className="font-medium text-[14px] leading-[17px] text-sapphire-blue mb-[6px] name">{plan.name}</h5>
          <p className="desc text-[12px] leading-4 text-white-blue">{plan.desc}</p>
          <div className="flex items-end mx-0 my-6">
            <span className="price font-bold text-[32px] leading-9 text-green">${isYearly ? plan.price * 9 : plan.price}</span>
            <span className="unit text-[12px] leading-[25px] text-white-gray opacity-90">/{isYearly ? 'year' : 'month'}</span>
          </div>
          <ul className="feature-list pt-6 pb-8 border-t border-solid border-dark-gray flex-grow">
            {plan.features.map((feature) => (
              <li key={feature} className="feature-item list-none flex items-center [&+&]:mt-2">
                <span className="w-4 h-4">
                  <CheckCircleIcon />
                </span>
                <span className="feature-text text-[14px] leading-6 text-white-gray ml-3">{feature}</span>
              </li>
            ))}
          </ul>
          {checkIsCurrentPlan(plan.id) ? (
            <Button className="get-start-btn w-full">{t('Profile.text.current_plan')}</Button>
          ) : (
            <Button color="primary" className="get-start-btn w-full">{t('Profile.text.get_started')}</Button>
          )}
        </div>
      ))} */}
    </div>
  );
};
export default Plans;
