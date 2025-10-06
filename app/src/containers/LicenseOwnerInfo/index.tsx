import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { HiOutlineUser, HiOutlineMail, HiOutlinePhone } from 'react-icons/hi';
import { FaChevronDown } from 'react-icons/fa';
import { useQuery, useMutation } from '@apollo/client';

import Input from '@/components/Common/Input';
import Button from '@/components/Common/Button';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import getLicenseOwnerInfoQuery from '@/queries/user/getLicenseOwnerInfo';
import updateLicenseOwnerInfoMutation from '@/queries/user/updateLicenseOwnerInfo';

// Country codes data
const countryCodes = [
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'China', code: '+86', flag: '🇨🇳' },
  { name: 'Japan', code: '+81', flag: '🇯🇵' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷' },
  { name: 'Mexico', code: '+52', flag: '🇲🇽' },
  { name: 'Spain', code: '+34', flag: '🇪🇸' },
  { name: 'Italy', code: '+39', flag: '🇮🇹' },
  { name: 'Netherlands', code: '+31', flag: '🇳🇱' },
  { name: 'Sweden', code: '+46', flag: '🇸🇪' },
  { name: 'Norway', code: '+47', flag: '🇳🇴' },
  { name: 'Denmark', code: '+45', flag: '🇩🇰' },
  { name: 'Finland', code: '+358', flag: '🇫🇮' },
  { name: 'Switzerland', code: '+41', flag: '🇨🇭' },
  { name: 'Austria', code: '+43', flag: '🇦🇹' },
];

const LicenseOwnerSchema = yup.object().shape({
  ownerName: yup
    .string()
    .required('License owner name is required')
    .max(100, 'Name cannot exceed 100 characters'),
  ownerEmail: yup
    .string()
    .required('License owner email is required')
    .email('Please enter a valid email address')
    .max(254, 'Email cannot exceed 254 characters'),
  phoneNumber: yup
    .string()
    .required('Phone number is required')
    .matches(/^[0-9\s\-\(\)]+$/, 'Please enter a valid phone number'),
});

type LicenseOwnerFormData = {
  ownerName: string;
  ownerEmail: string;
  phoneNumber: string;
  countryCode: string;
};

const LicenseOwnerInfo: React.FC = () => {
  const { t } = useTranslation();
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // GraphQL queries
  const {
    data: licenseOwnerData,
    loading: queryLoading,
    refetch,
  } = useQuery(getLicenseOwnerInfoQuery);
  const [updateLicenseOwnerInfo, { loading: mutationLoading }] = useMutation(
    updateLicenseOwnerInfoMutation,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<LicenseOwnerFormData>({
    resolver: yupResolver(LicenseOwnerSchema),
    defaultValues: {
      ownerName: '',
      ownerEmail: '',
      phoneNumber: '',
      countryCode: '+1',
    },
  });

  useDocumentHeader({ title: 'License Owner Info - WebAbility.io' });

  // Update form when data is loaded
  useEffect(() => {
    if (licenseOwnerData?.getLicenseOwnerInfo) {
      const userData = licenseOwnerData.getLicenseOwnerInfo;

      // Extract country code and phone number if phone_number exists
      let phoneNumber = '';
      let detectedCountry = countryCodes[0]; // Default to first country

      if (userData.phone_number) {
        // Try to match country codes from our list
        const matchingCountry = countryCodes.find((country) =>
          userData.phone_number?.startsWith(country.code),
        );

        if (matchingCountry) {
          detectedCountry = matchingCountry;
          phoneNumber = userData.phone_number.replace(matchingCountry.code, '');
        } else {
          phoneNumber = userData.phone_number;
        }
      }

      setSelectedCountry(detectedCountry);

      reset({
        ownerName: userData.name || '',
        ownerEmail: userData.license_owner_email || '',
        phoneNumber: phoneNumber,
        countryCode: detectedCountry.code,
      });
    }
  }, [licenseOwnerData, reset]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsCountryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const onSubmit = async (data: LicenseOwnerFormData) => {
    try {
      const { data: result } = await updateLicenseOwnerInfo({
        variables: {
          name: data.ownerName,
          license_owner_email: data.ownerEmail,
          phone_number: `${selectedCountry.code}${data.phoneNumber}`,
        },
      });

      if (result?.updateLicenseOwnerInfo) {
        toast.success(
          t('Common.license_owner.save_success') ||
            'License owner information saved successfully!',
        );
        // Refetch the data to update the form
        refetch();
      } else {
        toast.error(
          t('Common.license_owner.save_error') ||
            'Failed to save license owner information. Please try again.',
        );
      }
    } catch (error) {
      console.error('Error updating license owner info:', error);
      toast.error(
        t('Common.license_owner.save_error') ||
          'Failed to save license owner information. Please try again.',
      );
    }
  };

  const handleCountrySelect = (country: typeof countryCodes[0]) => {
    setSelectedCountry(country);
    setValue('countryCode', country.code);
    setIsCountryDropdownOpen(false);
  };

  if (queryLoading && !licenseOwnerData) {
    return (
      <div className="w-full">
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">
            Loading license owner information...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-3 sm:space-y-4 md:space-y-6"
      >
        {/* Website Owner's Name */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 items-start md:items-start lg:items-center">
          <label className="text-sm sm:text-base md:text-lg font-medium text-gray-700 flex items-center gap-2">
            <HiOutlineUser className="w-6 h-6 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            <span className="whitespace-nowrap">
              {t('Common.license_owner.owner_name') || 'Website owner name'}
            </span>
          </label>
          <div className="md:col-span-1 lg:col-span-2">
            <Input
              name="ownerName"
              ref={register}
              placeholder={
                t('Common.license_owner.enter_owner_name') ||
                "Enter website owner's name"
              }
              className={errors.ownerName ? 'border-red-500' : ''}
            />
            {errors.ownerName && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">
                {errors.ownerName.message}
              </p>
            )}
          </div>
        </div>

        {/* Website Owner's Email */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 items-start md:items-start lg:items-center">
          <label className="text-sm sm:text-base md:text-lg font-medium text-gray-700 flex items-center gap-2">
            <HiOutlineMail className="w-6 h-6 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            <span className="whitespace-nowrap">
              {t('Common.license_owner.owner_email') || "Website owner's email"}
            </span>
          </label>
          <div className="md:col-span-1 lg:col-span-2">
            <Input
              name="ownerEmail"
              ref={register}
              type="email"
              placeholder={
                t('Common.license_owner.enter_owner_email') ||
                "Enter website owner's email"
              }
              className={errors.ownerEmail ? 'border-red-500' : ''}
            />
            {errors.ownerEmail && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">
                {errors.ownerEmail.message}
              </p>
            )}
          </div>
        </div>

        {/* Phone Number */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 items-start md:items-start lg:items-center">
          <label className="text-sm sm:text-base md:text-lg font-medium text-gray-700 flex items-center gap-2">
            <HiOutlinePhone className="w-6 h-6 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
            <span className="whitespace-nowrap">
              {t('Common.license_owner.phone_number') || 'Phone number'}
            </span>
          </label>
          <div className="md:col-span-1 lg:col-span-2">
            {/* Responsive row/col for code and number */}
            <div className="flex flex-col md:flex-row gap-2 sm:gap-3 md:gap-4">
              {/* Country Code Dropdown */}
              <div
                className="relative flex-shrink-0 md:w-1/3"
                ref={dropdownRef}
              >
                <button
                  type="button"
                  onClick={() =>
                    setIsCountryDropdownOpen(!isCountryDropdownOpen)
                  }
                  className="flex items-center gap-2 bg-light-gray border border-white-blue rounded-[10px] px-[10px] py-[10.5px] text-[13px] sm:text-[14px] md:text-[16px] text-white-gray w-full hover:border-light-primary transition-colors h-[42px]"
                >
                  <span className="text-base sm:text-lg">
                    {selectedCountry.flag}
                  </span>
                  <span className="truncate flex-1 text-left">
                    {selectedCountry.code}
                  </span>
                  <FaChevronDown className="w-3 h-3 sm:w-4 sm:h-4 ml-auto flex-shrink-0" />
                </button>

                {isCountryDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto w-full">
                    {countryCodes.map((country) => (
                      <button
                        key={country.code + country.name}
                        type="button"
                        onClick={() => handleCountrySelect(country)}
                        className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-2 hover:bg-gray-50 text-left transition-colors text-xs sm:text-sm md:text-base min-h-[44px] sm:min-h-[40px]"
                      >
                        <span className="text-base sm:text-lg">
                          {country.flag}
                        </span>
                        <span className="text-gray-700 truncate">
                          {country.code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone Number Input */}
              <div className="flex-1">
                <Input
                  name="phoneNumber"
                  ref={register}
                  placeholder={
                    t('Common.license_owner.enter_phone_number') ||
                    'Enter phone number'
                  }
                  className={`${
                    errors.phoneNumber ? 'border-red-500' : ''
                  } h-[42px]`}
                />
                {errors.phoneNumber && (
                  <p className="text-red-500 text-xs sm:text-sm mt-1">
                    {errors.phoneNumber.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 sm:pt-3 md:pt-4">
          <Button
            type="submit"
            color="primary"
            className="px-4 sm:px-6 md:px-8 py-3 text-sm sm:text-base md:text-lg font-semibold w-full sm:w-auto"
            disabled={queryLoading || mutationLoading}
          >
            {mutationLoading
              ? t('Common.license_owner.saving') || 'Saving...'
              : t('Common.license_owner.save_changes') || 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LicenseOwnerInfo;
