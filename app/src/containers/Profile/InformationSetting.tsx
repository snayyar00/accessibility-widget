import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useMutation } from '@apollo/client';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

import type { Profile } from '@/features/auth/user';
import updateProfileQuery from '@/queries/user/updateProfile';
import AccountForm from '@/components/Profile/AccountForm';
import AvatarIcon from '@/assets/images/avatar.jpg';
import { ReactComponent as SettingIcon } from '@/assets/images/svg/setting.svg';
import { ReactComponent as ArrowDown24Icon } from '@/assets/images/svg/arrow-down-24.svg';
import InitialAvatar from '@/components/Common/InitialAvatar';
import DeleteAccount from './DeleteAccount';

const AccountSchema = yup.object().shape({
  name: yup.string().required('Common.validation.require_name'),
});

type Payload = {
  name: string;
  company: string;
  position: string;
}

type Props = {
  user: Profile;
};

const InformationSetting: React.FC<Props> = ({ user }) => {
  const { t } = useTranslation();
  const { register, handleSubmit, errors, setValue, getValues, watch } = useForm({
    resolver: yupResolver(AccountSchema),
    defaultValues: user,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenModalDeleteAccount, setIsOpenModalDeleteAccount] = useState(
    false,
  );

  const [updateProfileMutation, { error, loading }] = useMutation(
    updateProfileQuery,
  );


  async function onSubmit(dataForm: Payload) {
    const { name, company, position } = dataForm;
    const params = {
      name,
      company,
      position,
    };

    try {
      const { data } = await updateProfileMutation({ variables: params });
      if (data?.updateProfile) {
        toast.success(t('Common.status.update_success'));
      }
    } catch (err) {
      console.log(err);
    }
  }


  return (
    <div
      className={cn("border-b border-solid border-dark-grey shadow-xxl max-h-[90px] transition[-max-h] duration-300 ease-in-out overflow-hidden", {
        'max-h-[1000px]': isOpen
      })}>
      <div onClick={() => setIsOpen(!isOpen)} role="presentation" className="flex justify-between items-center cursor-pointer h-[90px]">
        <div className="flex items-center">
          <div className="w-[62px] h-[62px] sm:w-[35px] sm:h-[35px]">
            <InitialAvatar 
              name={user.name || 'User'} 
              size={62}
              className="sm:w-[35px] sm:h-[35px]"
            />
          </div>
          <div className="flex flex-col ml-4 sm:ml-[5px]">
            <span className="text-[16px] leading-[26px] text-sapphire-blue mb-[2px]">{user.name}</span>
            <span className="text-[12px] leading-4 text-white-gray opacity-90">{user.email}</span>
          </div>
        </div>
        <div className="flex items-center">
          <span className="hidden font-bold text-[14px] leading-[22px] mr-[14px] text-light-primary max-h-[22px] sm:mr-0 sm:block"><SettingIcon /></span>
          <span className="block font-bold text-[14px] leading-[22px] mr-[14px] text-light-primary max-h-[22px] sm:mr-0 sm:hidden">{t('Common.label.edit_profile')}</span>
          <ArrowDown24Icon
            className={cn("rotate-0 transition-transform duration-300 ease-only-ease", {
              "rotate-[-180]": isOpen
            })} />
        </div>
      </div>
      <AccountForm
        onSubmit={handleSubmit(onSubmit)}
        register={register}
        loading={loading}
        errors={errors}
        apiError={error?.message}
        openPopupDeleteAccount={() => setIsOpenModalDeleteAccount(true)}
      />
      <DeleteAccount
        isOpen={isOpenModalDeleteAccount}
        closeModal={() => setIsOpenModalDeleteAccount(false)}
      />
    </div>
  );
};

export default InformationSetting;
