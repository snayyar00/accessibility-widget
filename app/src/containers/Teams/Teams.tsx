import React, { useState, FormEvent } from 'react';
import './Teams.css';
import { useMutation } from '@apollo/client';
import addSite from '@/queries/sites/addSite';
import { toast } from 'react-toastify';
import isValidDomain from '@/utils/verifyDomain';
import DomainTable from './DomainTable';
import TrialBannerAndModal from '../Dashboard/TrialBannerAndModal';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';

interface DomainFormData {
  domainName: string;
}

const Teams = ({ domains, setReloadSites }: any) => {
   const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.add_domain') });
  const [addSiteMutation, { error, loading }] = useMutation(addSite, {
    onCompleted: () => {
      setReloadSites(true);
      toast.success('The domain was successfully added to the database.');
    },
  });
  // const [formData, setFormData] = useState<DomainFormData>({ domainName: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = () => {setIsModalOpen(true)};
  const closeModal = () => {setIsModalOpen(false);setOptionalDomain("yes");setPaymentView(false);};
  const [paymentView, setPaymentView] = useState(false);
  const [optionalDomain,setOptionalDomain] = useState("yes");

  // const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setFormData({ ...formData, [e.target.name]: e.target.value });
  // };

  // const handleSubmit = async (e: FormEvent) => {
  //   e.preventDefault();
  //   if (!isValidDomain(formData.domainName)) {
  //     toast.error('You must enter a valid domain name!');
  //     return;
  //   }
  //   // const sanitizedDomain = formData.domainName.replace(/^(https?:\/\/)/, '');
  //   const sanitizedDomain = formData.domainName.replace(/^(https?:\/\/)?(www\.)?/, '');
  //   addSiteMutation({ variables: { url: sanitizedDomain } })

  // };

  return (
    <>
      <h3 className="font-bold text-[26px] leading-9 text-sapphire-blue mb-8">
        Add new domain
      </h3>
      <div className="add-domain-container">
        {/* <div className="add-domain-form-container">
          <form onSubmit={handleSubmit} className="add-domain-form">
            <div className="form-group">
              <input
                type="text"
                id="domainName"
                name="domainName"
                placeholder="Add a new domain name"
                value={formData.domainName}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>
            
            <button type="submit" className="submit-btn">
              {loading ? 'Adding...' : 'Add Domain'}
            </button>
          </form>
          
          {error ? (
            toast.error('There was an error adding the domain to the database.')
          ) : (
            <></>
          )}
        </div> */}
        <TrialBannerAndModal allDomains={domains} setReloadSites={setReloadSites} isModalOpen={isModalOpen} closeModal={closeModal} openModal={openModal} paymentView={paymentView} setPaymentView={setPaymentView} optionalDomain={optionalDomain}/>
        <DomainTable data={domains} setReloadSites={setReloadSites} setPaymentView={setPaymentView} openModal={openModal} setOptionalDomain={setOptionalDomain}/>
      </div>
    </>
  );
};

export default Teams;
