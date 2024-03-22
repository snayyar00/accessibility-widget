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
import { CircularProgress } from '@mui/material';

import WebsiteScanAnimation from '@/components/Animations/WebsiteScanAnimation';
import LeftArrowAnimation from '@/components/Animations/LeftArrowAnimation';
import AccessibilityScoreCard from './AccessibiltyScoreCard';
import AccordionCard from './AccordionCard';
import AccessibilityIssuesGroup from './AccessibilityIssuesGroup';
import './AccessibilityReport.css';
import IssueCategoryCard from './IssueCategoryCard';


const AccessibilityReport = ({ currentDomain }: any) => {
  const [score, setScore] = useState(0);
  const [scoreBackup, setScoreBackup] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [domain, setDomain] = useState(currentDomain);
  const [issueType, setIssueType] = useState('Errors');
  // const [accessibilityData, setAccessibilityData] = useState({});

  const [getAccessibilityStatsQuery, { data, loading, error }] = useLazyQuery(getAccessibilityStats, {
    variables: { url: domain }
  });

  useEffect(() => {
    console.log(data)
    if (data) {
      const { htmlcs } = data.getAccessibilityReport;
      setScoreBackup(data.getAccessibilityReport.score);
      setScore(data.getAccessibilityReport.score);
      groupByCode(htmlcs);
      // setAccessibilityData(htmlcs);
      console.log(data.getAccessibilityReport.htmlcs)
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
    setDomain(e.target.value);
     // Update state with input value
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

  function groupByCodeUtil(issues: any) {
    const groupedByCode: any = {};
    if (Array.isArray(issues)) {
      issues.forEach((warning) => {
        const { code } = warning;
        if (!groupedByCode[code]) {
          groupedByCode[code] = [];
        }
        groupedByCode[code].push(warning);
      });
    }
    return groupedByCode;
  }

  function groupByCode(issues: any) {
    console.log('group code called')
    if (issues && typeof issues === 'object') {
      issues.errors = groupByCodeUtil(issues.errors);
      issues.warnings = groupByCodeUtil(issues.warnings);
      issues.notices = groupByCodeUtil(issues.notices);
    }
  }


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
          {loading && <CircularProgress size={14} sx={{ color: 'white' }} className='ml-2 my-auto' />}
        </button>
      </form>
      {loading ? <WebsiteScanAnimation className='mt-8' /> : <div className="accessibility-container">
        <div className="accessibility-card">
          <h3 className='text-center font-bold text-sapphire-blue text-lg mb-3'>Status</h3>
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
          <h3 className='text-center font-bold text-sapphire-blue text-lg mb-3'>Lawsuit Risk</h3>
          <div className='flex justify-center'>
            <FaGaugeSimpleHigh style={score > 89 ? { transform: 'scaleX(-1)' } : {}} size={90} color={score > 89 ? 'green' : '#ec4545'} />
          </div>
          <div className={`card-risk ${score > 89 ? 'low' : 'high'}`}>{score > 89 ? 'Low' : 'High'}</div>
          <p>Multiple violations may be exposing your site to legal action.</p>
        </div>

        <div className='flex items-center justify-center mt-3'>
          See your results with WebAbility! 🚀

          <button
            type="button"
            aria-pressed="false"
            aria-label="Toggle to see results with webability turned on."
            className={`${enabled ? 'bg-primary' : 'bg-dark-gray'} ml-6 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            onClick={enableButton}
          >
            <span
              aria-hidden="true"
              className={`${enabled ? 'translate-x-5' : 'translate-x-0'} bg inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
            />
          </button>
          <LeftArrowAnimation />

          {/* <div className="arrow-container justify-self-end ml-8">
            <div className="arrow-animation">
              <div className="arrow-head"></div>
              <div className="arrow-body"></div>
            </div>
          </div> */}

        </div>
        {data && <>
          <h3 className='text-3xl font-semibold text-sapphire-blue mb-2'>Accessibility Issues</h3>
          {/* <ToggleButtonGroup
          size="sm"
          buttonFlex={1}
          value={issueType}
          onChange={(event, newValue) => setIssueType(newValue || issueType)}
        >
          <Button value="Errors">Errors</Button>
          <Button value="Warnings">Warnings</Button>
          <Button value="Notices">Notices</Button>
        </ToggleButtonGroup> */}
          <IssueCategoryCard data={data} issueType='Errors' />
          <IssueCategoryCard data={data} issueType='Warnings' />
          <IssueCategoryCard data={data} issueType='Notices' />
        </>
        }
      </div>}
    </div>
  );
}

export default AccessibilityReport;