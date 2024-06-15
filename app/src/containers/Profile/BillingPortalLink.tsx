import { useState } from 'react'
import { useSelector } from 'react-redux';
import { RootState } from '../../config/store';

function BillingPortalLink() {
    const { data, loading } = useSelector((state: RootState) => state.user);
    const [clicked,setClicked] = useState(false);

  const handleBilling = async () => {
    setClicked(true);
    const url = 'http://localhost:5000/billing-portal-session';
    const bodyData = { email:data.email,returnURL:window.location.href };

    await fetch(url, {
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
          setClicked(false);
          window.location.href = data.url;
        });
      })
      .catch(error => {
        // Handle error
        console.error('There was a problem with the fetch operation:', error);
      });
  }
  return (
    <div
              className={"max-h-[100px] pb-8 border-t border-solid border-dark-grey transition-[max-height] duration-300 ease-in-out overflow-hidden"
              }
            >
              <div role="presentation" className="flex justify-between items-center cursor-pointer h-[90px]">
                <div className="flex flex-col">
                  <p className="text-[16px] leading-[26px] text-sapphire-blue">Billing Portal</p>
                  <span className="text-[12px] leading-4 text-white-gray">Manage all your subscriptions in one place, fast and simple</span>
                </div>
                <div className="flex items-center">
                  <span className="block font-bold text-[14px] leading-[22px] mr-[14px] text-light-primary max-h-[22px] sm:mr-0 sm:text-left sm:hidden">
                    <button className='submit-btn' onClick={handleBilling}>{clicked?("Please Wait..."):("Billing Portal")}</button>
                  </span>
                </div>
              </div>
            </div>
  )
}

export default BillingPortalLink