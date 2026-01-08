import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { MdWarning, MdDeleteForever, MdClose } from 'react-icons/md';

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
      {/* Header with warning icon */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-t-[10px] relative">
        <div className="flex items-center gap-3">
          <div className="bg-red-400 bg-opacity-20 p-2 rounded-full">
            <MdWarning className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">{t('Profile.label.delete')}</h2>
        </div>
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-white hover:text-red-200 transition-colors"
          disabled={loading}
        >
          <MdClose className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={onSubmit}>
        {/* Content */}
        <div className="p-8">
          {/* Warning message */}
          <div className="mb-8">
            <p className="text-gray-700 text-base leading-relaxed mb-4">
              Are you sure you want to delete your account? All of your data
              will be permanently removed. This action cannot be undone.
            </p>

            {/* Email confirmation prompt */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <label
                htmlFor="email"
                className="block text-sm text-gray-600 mb-2 font-medium"
              >
                <Trans
                  components={[<span className="text-red-600 font-bold" />]}
                  values={{ email }}
                >
                  {t('Profile.text.please_enter')}
                </Trans>
              </label>

              <div className="relative">
                <input
                  type="email"
                  id="email"
                  name="email"
                  ref={register}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder="Enter your email address"
                  disabled={loading}
                />
                {errors?.email?.message && (
                  <div className="mt-2 text-sm text-red-600">
                    {String(t(errors.email.message))}
                  </div>
                )}
                {error && (
                  <div className="mt-2 text-sm text-red-600">
                    Failed to delete account. Please try again.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('Common.text.no')}
            </button>
            <button
              type="submit"
              disabled={!isValid || loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                !isValid || loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <MdDeleteForever className="w-4 h-4" />
                  {t('Common.text.delete')}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
export default DeleteAccountModal;
