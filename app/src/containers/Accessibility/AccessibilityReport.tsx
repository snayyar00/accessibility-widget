import React, { useEffect, useState } from 'react';
import './Accessibility.css'; // Make sure your CSS file is updated with the styles for the accordion
import { AiFillCloseCircle } from "react-icons/ai";
import { FaGaugeSimpleHigh } from "react-icons/fa6";
import { FaCheckCircle } from "react-icons/fa";
import { Link } from 'react-router-dom';
import getAccessibilityStats from '@/queries/accessibility/accessibility';
import { useQuery } from '@apollo/client';
import { toast } from 'react-toastify';
import isValidDomain from '@/utils/verifyDomain';
import AccessibilityScoreCard from './AccessibiltyScoreCard';
import AccordionCard from './AccordionCard';


const AccessibilityReport = ({ currentDomain }: any) => {
  const [score, setScore] = useState(0);
  const [scoreBackup, setScoreBackup] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [domain, setDomain] = useState(currentDomain);



  const { data, loading, refetch, error } = useQuery(getAccessibilityStats, {
    variables: { url: domain },
    skip: currentDomain === ''
  });

  useEffect(() => {
    console.log(data)
    if (data) {
      console.log(data.getAccessibilityReport.categories)
      setScoreBackup(data.getAccessibilityReport.accessibilityScore.score);
      setScore(data.getAccessibilityReport.accessibilityScore.score);
    }
  }, [data]);

  function enableButton() {
    if (enabled) {
      setEnabled(false);
      setScore(scoreBackup);
    }
    else {
      setEnabled(true);
      setScoreBackup(score);
      setScore(90);
    }
  }
  const handleInputChange = (e: any) => {
    setDomain(e.target.value); // Update state with input value
  };


  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!isValidDomain(domain)) {
      setDomain(currentDomain);
      return toast.error('You must enter a valid domain name!');
    }

    return refetch();

  };

  return (

    <div className="accessibility-wrapper">
      <form className="search-bar-container" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter a domain"
          className="search-input"
          value={domain}
          onChange={handleInputChange} // Set the onChange handler
        />
        <button type="submit" className="search-button bg-primary">
          Free Scan
        </button>
      </form>
      <div className="accessibility-container">
        <div className="accessibility-card">
          <div className="card-header">Status</div>
          <div className='flex justify-center w-full'>
            {score > 89 ?
              <FaCheckCircle size={90} color='green' /> :
              <AiFillCloseCircle size={90} color='red' />
            }
          </div>
          <div className={`card-status ${score > 89 ? 'low' : 'not-compliant'}`}>{score > 89 ? 'Compliant' : 'Not Compliant'}</div>
          <p>{score > 89 ? 'You achieved exceptionally high compliance status!' : 'Your site doesn\'t comply with WCAG 2.1 AA.'}</p>
        </div>

        <AccessibilityScoreCard score={score} />

        <div className="accessibility-card">
          <div className="card-header">Lawsuit Risk</div>
          <div className='flex justify-center'>
            <FaGaugeSimpleHigh style={score > 89 ? { transform: 'scaleX(-1)' } : {}} size={90} color={score > 89 ? 'green' : 'red'} />
          </div>
          <div className={`card-risk ${score > 89 ? 'low' : 'high'}`}>{score > 89 ? 'Low' : 'High'}</div>
          <p>Multiple violations may be exposing your site to legal action.</p>
        </div>

        <div className='flex items-center mt-3'>
          See your results with WebAbility! 🚀

          <button
            type="button"
            aria-pressed="false"
            aria-label="Toggle"
            className={`${enabled ? 'bg-primary' : 'bg-dark-gray'} ml-6 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            onClick={enableButton}
          >
            <span
              aria-hidden="true"
              className={`${enabled ? 'translate-x-5' : 'translate-x-0'} bg inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
            />
          </button>
          {/* <div className="arrow-container justify-self-end ml-8">
            <div className="arrow-animation">
              <div className="arrow-head"></div>
              <div className="arrow-body"></div>
            </div>
          </div> */}

        </div>


        <div className='flex w-full items-center justify-center text-lg mb-3 '>
          <Link to='/dashboard' className='hover:text-sapphire-blue underline' >Try free for 7 days!</Link>
        </div>

        {
          data && Object.keys(data.getAccessibilityReport.categories).map((key: any) => {
            const category = data.getAccessibilityReport.categories[key];
            return <AccordionCard heading={category.description} noOfFails={category.count} items={category.items} />
          }
          )
        }

        {/* <div className="accordion w-full">
          
          <details>
            <summary>Low Vision <span className="fail-count">24 Fail</span></summary>
            <p>Details about Low Vision accessibility issues...</p>
          </details>
        </div> */}
      </div>
    </div>
  );
}

export default AccessibilityReport;
