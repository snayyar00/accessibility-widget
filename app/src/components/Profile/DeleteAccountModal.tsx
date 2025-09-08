import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { ReactHookFormType } from '@/typeReactHookForm';
import Modal from '../Common/Modal';
import Button from '../Common/Button';
import Input from '../Common/Input/Input';
import ErrorText from '../Common/ErrorText';

type Props = ReactHookFormType & {
  closeModal?: () => void;
  isOpen: boolean;
  email?: string | null;
  isValid?: boolean;
  loading?: boolean;
  error?: any;
};

const DeleteAccountModal: React.FC<Props> = ({
  closeModal,
  isOpen,
  onSubmit,
  email,
  register,
  errors,
  isValid,
  loading,
  error,
}) => {
  const { t } = useTranslation();
  return (
    <Modal isOpen={isOpen}>
      <div className="font-bold text-[26px] leading-9 text-sapphire-blue pt-6 px-6">
        {t('Profile.label.delete')}
      </div>
      <form onSubmit={onSubmit}>
        <div className="p-6 border border-solid border-[#7c88b1] border-opacity-[0.16]">
          <p className="text-[14px] leading-6 text-white-gray">
            {t('Profile.text.delete_modal')}
          </p>
          <div className="mt-6">
            <div className="block w-full mb-4">
              <label
                htmlFor="email"
                className="font-bold text-[12px] leading-[15px] tracking-[2px] text-white-blue mix-blend-normal opacity-90 block mt-[19px] uppercase sm:text-[11px]"
              >
                <Trans
                  components={[
                    <div className="text-sapphire-blue font-bold" />,
                  ]}
                  values={{ email }}
                >
                  {t('Profile.text.please_enter')}
                </Trans>
              </label>
              <Input type="email" id="email" name="email" ref={register} />
              {errors?.email?.message && (
                <ErrorText message={String(t(errors.email.message))} />
              )}
              {error && (
                <ErrorText message="Failed to delete account. Please try again." />
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end items-center p-6 [&>button+button]:ml-4">
          <Button type="button" onClick={closeModal} disabled={loading}>
            {t('Common.text.no')}
          </Button>
          <Button type="submit" color="primary" disabled={!isValid || loading}>
            {loading ? 'Deleting...' : t('Common.text.delete')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
export default DeleteAccountModal;
