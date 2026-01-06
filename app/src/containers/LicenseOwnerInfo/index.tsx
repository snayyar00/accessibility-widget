import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import cn from 'classnames';
import { HiOutlineUser, HiOutlineMail, HiOutlinePhone } from 'react-icons/hi';
import { FaChevronDown } from 'react-icons/fa';
import { Settings, ChevronDown } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);
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
    <div className="space-y-4">
      {/* License Owner Info Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-3 md:space-y-0 p-3 md:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <div className="flex-1 w-full md:w-auto">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            {t('License Owner Information') || 'License Owner Information'}
          </h3>
          <p className="text-xs md:text-sm text-gray-600 mt-1">
            {t('Update your license owner details') ||
              'Update your license owner details'}
          </p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="license-info-form"
          className="w-auto md:w-auto flex-shrink-0 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Settings className="w-3 h-3 md:w-4 md:h-4 text-white" />
          <span className="text-white">
            {t('License info') || 'Edit Information'}
          </span>
          <ChevronDown
            className={cn(
              'w-3 h-3 md:w-4 md:h-4 transition-transform duration-300 text-white',
              {
                'rotate-180': isOpen,
              },
            )}
          />
        </button>
      </div>

      {/* Expandable Form Section */}
      <div
        id="license-info-form"
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden',
          {
            'max-h-0 opacity-0': !isOpen,
            'max-h-[1000px] opacity-100': isOpen,
          },
        )}
        aria-hidden={!isOpen}
        style={!isOpen ? { display: 'none' } : { display: 'block' }}
      >
        <div className="bg-gray-50 rounded-lg p-4 md:p-6">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-3 sm:space-y-4 md:space-y-6 max-w-full min-w-0"
          >
            <p className="text-xs text-gray-600 mb-4">
              Fields marked with an asterisk (*) are required.
            </p>
            {/* Website Owner's Name */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 items-start md:items-start lg:items-center max-w-full min-w-0">
              <label 
                htmlFor="owner-name"
                className="text-sm sm:text-base md:text-lg font-medium text-gray-700 flex items-center gap-2"
              >
                <HiOutlineUser className="w-6 h-6 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <span>
                  {t('Common.license_owner.owner_name') || 'Website owner name'}{' '}
                  <span className="text-red-600" aria-label="required">*</span>
                </span>
              </label>
              <div className="md:col-span-1 lg:col-span-2">
                <Input
                  id="owner-name"
                  name="ownerName"
                  ref={register}
                  autoComplete="name"
                  placeholder={
                    t('Common.license_owner.enter_owner_name') ||
                    "Enter website owner's name"
                  }
                  aria-label={`License owner ${t('Common.license_owner.owner_name') || 'Name'}`}
                  aria-invalid={!!errors.ownerName}
                  aria-describedby="owner-name-error"
                  className={errors.ownerName ? 'border-red-500' : ''}
                />
                <div
                  id="owner-name-error"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                  aria-relevant="additions text"
                >
                  {errors.ownerName && (
                    <p 
                      className="text-xs sm:text-sm mt-1"
                      style={{ color: '#E51414', backgroundColor: '#F9FAFB' }}
                    >
                      {errors.ownerName.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Website Owner's Email */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 items-start md:items-start lg:items-center max-w-full min-w-0">
              <label 
                htmlFor="owner-email"
                className="text-sm sm:text-base md:text-lg font-medium text-gray-700 flex items-center gap-2"
              >
                <HiOutlineMail className="w-6 h-6 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <span>
                  {t('Common.license_owner.owner_email') ||
                    "Website owner's email"}{' '}
                  <span className="text-red-600" aria-label="required">*</span>
                </span>
              </label>
              <div className="md:col-span-1 lg:col-span-2">
                <Input
                  id="owner-email"
                  name="ownerEmail"
                  ref={register}
                  type="email"
                  autoComplete="email"
                  placeholder={
                    t('Common.license_owner.enter_owner_email') ||
                    "Enter website owner's email"
                  }
                  aria-label={`License owner ${t('Common.license_owner.owner_email') || 'Email'}`}
                  aria-invalid={!!errors.ownerEmail}
                  aria-describedby="owner-email-error"
                  className={errors.ownerEmail ? 'border-red-500' : ''}
                />
                <div
                  id="owner-email-error"
                  role="alert"
                  aria-live="assertive"
                  aria-atomic="true"
                  aria-relevant="additions text"
                >
                  {errors.ownerEmail && (
                    <p 
                      className="text-xs sm:text-sm mt-1"
                      style={{ color: '#E51414', backgroundColor: '#F9FAFB' }}
                    >
                      {errors.ownerEmail.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Phone Number */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 md:gap-4 items-start md:items-start lg:items-center max-w-full min-w-0">
              <label 
                htmlFor="phone-number"
                className="text-sm sm:text-base md:text-lg font-medium text-gray-700 flex items-center gap-2"
              >
                <HiOutlinePhone className="w-6 h-6 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <span>
                  {t('Common.license_owner.phone_number') || 'Phone number'}{' '}
                  <span className="text-red-600" aria-label="required">*</span>
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
                    <label htmlFor="country-code" className="sr-only">
                      License owner Country code
                    </label>
                    <button
                      id="country-code"
                      type="button"
                      onClick={() =>
                        setIsCountryDropdownOpen(!isCountryDropdownOpen)
                      }
                      aria-label="License owner Country code"
                      aria-expanded={isCountryDropdownOpen}
                      aria-haspopup="listbox"
                      aria-controls="country-code-listbox"
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
                      <div 
                        id="country-code-listbox"
                        role="listbox"
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto w-full"
                      >
                        {countryCodes.map((country) => (
                          <button
                            key={country.code + country.name}
                            type="button"
                            role="option"
                            aria-selected={selectedCountry.code === country.code && selectedCountry.name === country.name}
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
                      id="phone-number"
                      name="phoneNumber"
                      ref={register}
                      placeholder={
                        t('Common.license_owner.enter_phone_number') ||
                        'Enter phone number'
                      }
                      aria-label={`License owner ${t('Common.license_owner.phone_number') || 'Phone number'}`}
                      aria-invalid={!!errors.phoneNumber}
                      aria-describedby="phone-number-error"
                      className={`${
                        errors.phoneNumber ? 'border-red-500' : ''
                      } h-[42px]`}
                    />
                    <div
                      id="phone-number-error"
                      role="alert"
                      aria-live="assertive"
                      aria-atomic="true"
                      aria-relevant="additions text"
                    >
                      {errors.phoneNumber && (
                        <p 
                          className="text-xs sm:text-sm mt-1"
                          style={{ color: '#E51414', backgroundColor: '#F9FAFB' }}
                        >
                          {errors.phoneNumber.message}
                        </p>
                      )}
                    </div>
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
      </div>
    </div>
  );
};

export default LicenseOwnerInfo;
