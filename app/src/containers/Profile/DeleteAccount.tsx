import React from 'react';
import Portal from '@/components/Common/Portal';
import * as yup from 'yup';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useSelector } from 'react-redux';
import { useMutation } from '@apollo/client';
import { useHistory } from 'react-router-dom';

import DeleteAccountModal from '@/components/Profile/DeleteAccountModal';
import deleteAccountQuery from '@/queries/user/deleteAccount';
import { RootState } from '@/config/store';
import { clearAuthenticationCookie } from '@/utils/cookie';

type Props = {
  closeModal?: () => void;
  isOpen: boolean;
};

const DeleteAccount: React.FC<Props> = ({ closeModal, isOpen }) => {
  const {
    data: { email },
  } = useSelector((state: RootState) => state.user);
  const history = useHistory();
  const emailRegex = new RegExp(`^${email}$`);
  const AccountSettingSchema = yup.object().shape({
    email: yup
      .string()
      .required('Common.validation.require_email')
      .email('Common.validation.valid_email')
      .matches(emailRegex, 'Email must match your account email address'),
  });
  const { register, handleSubmit, errors, watch, formState } = useForm({
    resolver: yupResolver(AccountSettingSchema),
    defaultValues: { email: '' },
    mode: 'all',
  });
  const watchEmail = watch('email');
  const [deleteAccountMutation, { loading, error }] =
    useMutation(deleteAccountQuery);

  async function onSubmit() {
    try {
      const { data } = await deleteAccountMutation();

      if (data?.deleteAccount) {
        clearAuthenticationCookie();
        history.replace('/auth/signin');
      }
    } catch (err) {
      console.error('Error deleting account:', err);
    }
  }

  return (
    <Portal id="delete-account">
      <DeleteAccountModal
        closeModal={closeModal}
        isOpen={isOpen}
        register={register}
        errors={errors}
        email={email}
        isValid={formState.isValid && watchEmail !== ''}
        onSubmit={handleSubmit(onSubmit)}
        loading={loading}
        error={error}
      />
    </Portal>
  );
};

export default DeleteAccount;
