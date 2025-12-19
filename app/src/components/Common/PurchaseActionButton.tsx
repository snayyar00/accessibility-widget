import React, { useMemo } from 'react';
import { Tooltip } from '@mui/material';

type ActionType = 'activate-subscription' | 'activate-modal' | 'buy';

type PurchaseActionConfig = {
  isAppSumoOrg: boolean;
  activePlan: string;
  tierPlan: boolean;
  appSumoCount: number;
  codeCount: number;
};

export type PurchaseActionButtonProps = PurchaseActionConfig & {
  billingLoading?: boolean;
  onActivateSubscription?: () => void;
  onOpenActivateModal?: () => void;
  onBuyLicense?: () => void;
  className?: string;
  useTooltip?: boolean;
  tooltipPlacement?: 'bottom' | 'left' | 'right' | 'top' | 'bottom-end' | 'bottom-start' | 'left-end' | 'left-start' | 'right-end' | 'right-start' | 'top-end' | 'top-start';
};

export const computePurchaseAction = ({
  isAppSumoOrg,
  activePlan,
  tierPlan,
  appSumoCount,
  codeCount,
}: PurchaseActionConfig): { action: ActionType; label: string; tooltip: string } => {
  if (!isAppSumoOrg) {
    return { action: 'buy', label: 'Buy License', tooltip: 'Buy license' };
  }

  if (activePlan !== '' && tierPlan) {
    return { action: 'activate-subscription', label: 'Activate', tooltip: 'Activate subscription' };
  }

  if (appSumoCount < codeCount) {
    return { action: 'activate-modal', label: 'Activate', tooltip: 'Activate with promo code' };
  }

  return { action: 'buy', label: 'Buy License', tooltip: 'Buy license' };
};

const PurchaseActionButton: React.FC<PurchaseActionButtonProps> = ({
  isAppSumoOrg,
  activePlan,
  tierPlan,
  appSumoCount,
  codeCount,
  billingLoading = false,
  onActivateSubscription,
  onOpenActivateModal,
  onBuyLicense,
  className,
  useTooltip = false,
  tooltipPlacement = 'top',
}) => {
  const actionConfig = useMemo(
    () => computePurchaseAction({ isAppSumoOrg, activePlan, tierPlan, appSumoCount, codeCount }),
    [isAppSumoOrg, activePlan, tierPlan, appSumoCount, codeCount],
  );

  const disabled = billingLoading && actionConfig.action === 'activate-subscription';

  const handleClick = () => {
    if (disabled) return;

    if (actionConfig.action === 'activate-subscription' && onActivateSubscription) {
      onActivateSubscription();
      return;
    }
    if (actionConfig.action === 'activate-modal' && onOpenActivateModal) {
      onOpenActivateModal();
      return;
    }
    if (actionConfig.action === 'buy' && onBuyLicense) {
      onBuyLicense();
    }
  };

  const button = (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={className}
      aria-label={actionConfig.tooltip}
    >
      {disabled ? 'Processing...' : actionConfig.label}
    </button>
  );

  if (!useTooltip) {
    return button;
  }

  return (
    <Tooltip title={actionConfig.tooltip} placement={tooltipPlacement}>
      <span>{button}</span>
    </Tooltip>
  );
};

export default PurchaseActionButton;

