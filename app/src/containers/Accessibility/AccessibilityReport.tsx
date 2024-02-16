import React, { useEffect, useState } from 'react';
import './Accessibility.css'; // Make sure your CSS file is updated with the styles for the accordion
import { AiFillCloseCircle } from "react-icons/ai";
import { FaGaugeSimpleHigh } from "react-icons/fa6";
import { FaCheckCircle } from "react-icons/fa";
import { Link } from 'react-router-dom';
import getAccessibilityStats from '@/queries/accessibility/accessibility';
import { useLazyQuery } from '@apollo/client';
import { toast } from 'react-toastify';
import isValidDomain from '@/utils/verifyDomain';
import Button from '@mui/joy/Button';
import AccordionGroup from '@mui/joy/AccordionGroup';
import Accordion from '@mui/joy/Accordion';
import ToggleButtonGroup from '@mui/joy/ToggleButtonGroup';
import Stack from '@mui/joy/Stack';
import AccordionDetails, {
  accordionDetailsClasses,
} from '@mui/joy/AccordionDetails';
import AccordionSummary, {
  accordionSummaryClasses,
} from '@mui/joy/AccordionSummary';

import AccessibilityScoreCard from './AccessibiltyScoreCard';
import AccordionCard from './AccordionCard';


const AccessibilityReport = ({ currentDomain }: any) => {
  const [score, setScore] = useState(0);
  const [scoreBackup, setScoreBackup] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [domain, setDomain] = useState(currentDomain);
  const [issueType, setIssueType] = useState('Errors');

  const [getAccessibilityStatsQuery, { data, loading, error }] = useLazyQuery(getAccessibilityStats, {
    variables: { url: domain }
  });

  useEffect(() => {
    console.log(data)
    if (data) {
      console.log(data.getAccessibilityReport.categories)
      setScoreBackup(data.getAccessibilityReport.score);
      setScore(data.getAccessibilityReport.score);
    }
  }, [data]);

  useEffect(() => {
    if (currentDomain !== '') {
      getAccessibilityStatsQuery();
    }
  }, []);

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


  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!isValidDomain(domain)) {
      setDomain(currentDomain);
      toast.error('You must enter a valid domain name!');
      return;
    }
    getAccessibilityStatsQuery(); // Manually trigger the query
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
              <AiFillCloseCircle size={90} color='#ec4545' />
            }
          </div>
          <div className={`card-status ${score > 89 ? 'low' : 'not-compliant'}`}>{score > 89 ? 'Compliant' : 'Not Compliant'}</div>
          <p>{score > 89 ? 'You achieved exceptionally high compliance status!' : 'Your site doesn\'t comply with WCAG 2.1 AA.'}</p>
        </div>

        <AccessibilityScoreCard score={score} />

        <div className="accessibility-card">
          <div className="card-header">Lawsuit Risk</div>
          <div className='flex justify-center'>
            <FaGaugeSimpleHigh style={score > 89 ? { transform: 'scaleX(-1)' } : {}} size={90} color={score > 89 ? 'green' : '#ec4545'} />
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
        <ToggleButtonGroup
          size="sm"
          buttonFlex={1}
          value={issueType}
          onChange={(event, newValue) => setIssueType(newValue || issueType)}
        >
          <Button value="Errors">Errors</Button>
          <Button value="Warnings">Warnings</Button>
          <Button value="Notices">Notices</Button>
        </ToggleButtonGroup>
        <AccordionGroup
          className="bg-gray"
          sx={{
            padding: '1%',
            borderRadius: 'md'
          }}
        >
          {data && issueType === 'Errors' && data.getAccessibilityReport.htmlcs.errors.map((item: any) =>
            <Accordion>
              <AccordionSummary className="text-sm font-medium p-1">{item.code}</AccordionSummary>
              <AccordionDetails className="p-2">
                <AccordionCard heading={item.message} description={item.description} help={item.recommended_action} />
              </AccordionDetails>
            </Accordion>

          )}
          {data && issueType === 'Warnings' && data.getAccessibilityReport.htmlcs.warnings.map((item: any) =>
            <Accordion>
              <AccordionSummary className="text-sm font-medium p-1">{item.code}</AccordionSummary>
              <AccordionDetails className="p-2">
                <AccordionCard heading={item.message} description={item.description} help={item.recommended_action} />
              </AccordionDetails>
            </Accordion>

          )}
          {data && issueType === 'Notices' && data.getAccessibilityReport.htmlcs.notices.map((item: any) =>
            <Accordion>
              <AccordionSummary className="text-sm font-medium p-1">{item.code}</AccordionSummary>
              <AccordionDetails className="p-2">
                <AccordionCard heading={item.message} description={item.description} help={item.recommended_action} />
              </AccordionDetails>
            </Accordion>

          )}
        </AccordionGroup>

        
      </div>
    </div>
  );
}

export default AccessibilityReport;