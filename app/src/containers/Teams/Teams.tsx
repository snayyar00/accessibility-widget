import React, { useState, FormEvent, useEffect } from 'react';
import './Teams.css';
import { useMutation } from '@apollo/client';
import addSite from '@/queries/sites/addSite';
import { toast } from 'react-toastify';
import isValidDomain from '@/utils/verifyDomain';
import DomainTable from './DomainTable';
import { useSelector } from 'react-redux';
import { RootState } from '../../config/store';

interface DomainFormData {
  domainName: string;
}

const Teams = ({ domains, setReloadSites }: any) => {
  const [addSiteMutation, { error, loading }] = useMutation(addSite, {
    onCompleted: () => {
      setReloadSites(true);
      toast.success('The domain was successfully added to the database.');
    },
  });
  const [formData, setFormData] = useState<DomainFormData>({ domainName: '' });

  const { data, reduxloading } = useSelector((state: RootState) => state.user);

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

  const handleBilling = () => {
    const url = 'http://localhost:5000/create-customer-portal-session';
    const bodyData = { email: data.email,name:data.name };
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

        response.json().then(data => {
          // Handle the JSON data received from the backend
          window.location.href = data.url;
        });
      // Handle response
      console.log('Request successful',response);
    })
    .catch(error => {
      // Handle error
      console.error('There was a problem with the fetch operation:', error);
    });
  }


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
          
          {error ? (
            toast.error('There was an error adding the domain to the database.')
          ) : (
            <></>
          )}
        </div>
        <div className="flex items-center mt-2">
          <button className="submit-btn" onClick={handleBilling}>Manage billing</button>
        </div>
        <DomainTable data={domains} setReloadSites={setReloadSites} />
      </div>
    </>
  );
};

export default Teams;
