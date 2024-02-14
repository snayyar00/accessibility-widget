import React, { useState, FormEvent, useEffect } from 'react';
import './Teams.css';
import { useMutation } from '@apollo/client';
import addSite from '@/queries/sites/addSite';
import { toast } from 'react-toastify';
import isValidDomain from '@/utils/verifyDomain';

interface DomainFormData {
  domainName: string;
}

const Teams: React.FC = () => {
  const [addSiteMutation, { error, loading }] = useMutation(addSite);
  const [formData, setFormData] = useState<DomainFormData>({ domainName: '' });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValidDomain(formData.domainName)) {
      toast.error('You must enter a valid domain name!');
      return;
    }
    // const sanitizedDomain = formData.domainName.replace(/^(https?:\/\/)/, '');
    const sanitizedDomain = formData.domainName.replace(/^(https?:\/\/)?(www\.)?/, '');
    addSiteMutation({ variables: { url: sanitizedDomain } })

  };


  return (
    <>
      <h3 className="font-bold text-[26px] leading-9 text-sapphire-blue mb-8">
        Add new domain
      </h3>
      <div className="add-domain-container">

        <div className="add-domain-form-container">
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
          {error ? toast.error('There was an error adding the domain to the database.') : <></>}
        </div>
      </div>
    </>
  );
};

export default Teams;
