import React, { useEffect, useState } from 'react';
import './Accessibility.css'; // Make sure your CSS file is updated with the styles for the accordion
import { AiFillCloseCircle } from 'react-icons/ai';
import { FaGaugeSimpleHigh } from 'react-icons/fa6';
import { FaCheckCircle,FaCircle } from 'react-icons/fa';
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
import { ButtonGroup, Card, CardHeader, CardMedia, CircularProgress } from '@mui/material';

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
  const [siteImg,setSiteImg] = useState("");
  // const [accessibilityData, setAccessibilityData] = useState({});

  const [getAccessibilityStatsQuery, { data, loading, error }] = useLazyQuery(
    getAccessibilityStats,
    {
      variables: { url: domain },
    },
  );

  useEffect(() => {
    if (data) {
      const { htmlcs } = data.getAccessibilityReport;
      setSiteImg(data.getAccessibilityReport?.siteImg)
      setScoreBackup(data.getAccessibilityReport.score);
      console.log("ByFunction data = ",data?.getAccessibilityReport?.ByFunctions);
      setScore(data.getAccessibilityReport.score);
      groupByCode(htmlcs);
      // setAccessibilityData(htmlcs);
      console.log(data.getAccessibilityReport.htmlcs);
      console.log("Full Report",data.getAccessibilityReport);
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
    } else {
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
    console.log('group code called');
    if (issues && typeof issues === 'object') {
      issues.errors = groupByCodeUtil(issues.errors);
      issues.warnings = groupByCodeUtil(issues.warnings);
      issues.notices = groupByCodeUtil(issues.notices);
    }
  }

  const [activeTab, setActiveTab] = useState('By WCGA Guidelines');

  // Function to toggle active tab
  const toggleTab = () => {
    setActiveTab(
      activeTab === 'By Function' ? 'By WCGA Guidelines' : 'By Function',
    );
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
          {loading && (
            <CircularProgress
              size={14}
              sx={{ color: 'white' }}
              className="ml-2 my-auto"
            />
          )}
        </button>
      </form>
      {loading ? (
        <WebsiteScanAnimation className="mt-8" />
      ) : (
        <div className="accessibility-container">
          <div className="accessibility-card">
            <h3 className="text-center font-bold text-sapphire-blue text-lg mb-3">
              Status
            </h3>
            <div className="flex justify-center w-full">
              {score > 89 ? (
                <FaCheckCircle size={90} color="green" />
              ) : (
                <AiFillCloseCircle size={90} color="#ec4545" />
              )}
            </div>
            <div
              className={`card-status ${score > 89 ? 'low' : 'not-compliant'}`}
            >
              {score > 89 ? 'Compliant' : 'Not Compliant'}
            </div>
            <p>
              {score > 89
                ? 'You achieved exceptionally high compliance status!'
                : "Your site doesn't comply with WCAG 2.1 AA."}
            </p>
          </div>

          <AccessibilityScoreCard score={score} />

          <div className="accessibility-card">
            <h3 className="text-center font-bold text-sapphire-blue text-lg mb-3">
              Lawsuit Risk
            </h3>
            <div className="flex justify-center">
              <FaGaugeSimpleHigh
                style={score > 89 ? { transform: 'scaleX(-1)' } : {}}
                size={90}
                color={score > 89 ? 'green' : '#ec4545'}
              />
            </div>
            <div className={`card-risk ${score > 89 ? 'low' : 'high'}`}>
              {score > 89 ? 'Low' : 'High'}
            </div>
            <p>
              Multiple violations may be exposing your site to legal action.
            </p>
          </div>

          <div className="flex items-center justify-center mt-3">
            See your results with WebAbility! 🚀
            <button
              type="button"
              aria-pressed="false"
              aria-label="Toggle to see results with webability turned on."
              className={`${
                enabled ? 'bg-primary' : 'bg-dark-gray'
              } ml-6 relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              onClick={enableButton}
            >
              <span
                aria-hidden="true"
                className={`${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                } bg inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
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
          {data &&
            <>
              <h3 className="text-3xl font-semibold text-sapphire-blue mb-2">
                Accessibility Issues
              </h3>
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
              <Card  sx={{ maxWidth: 400,borderRadius: 'md', marginY:4 }}>
                <CardMedia
                  component="img"
                  height="250"
                  image={siteImg}
                  alt="Site Preview Image"
                />
              </Card>

              <div>
                <div>
                  <div className="flex justify-center items-center -mx-4 overflow-x-auto overflow-y-hidden sm:justify-center flex-nowrap dark:text-white-800">
                    <a
                      className={`flex items-center flex-shrink-0 px-5 py-3 space-x-2 dark:text-white-600 cursor-pointer ${
                        activeTab === 'By Function'
                          ? 'border border-b-0 rounded-t-lg'
                          : ''
                      }`}
                      onClick={toggleTab}
                      style={
                        activeTab === 'By Function'
                          ? { backgroundColor: '#007bff', color: 'white' }
                          : { color: 'black' }
                      }
                    >
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 22 22"
                        fill="none"
                      >
                        <path
                          d="M10.125 20.625C10.125 21.1082 10.5168 21.5 11 21.5C11.4832 21.5 11.875 21.1082 11.875 20.625H10.125ZM11.875 1.375C11.875 0.891751 11.4832 0.5 11 0.5C10.5168 0.5 10.125 0.891751 10.125 1.375H11.875ZM18 20.625C18 21.1082 18.3918 21.5 18.875 21.5C19.3582 21.5 19.75 21.1082 19.75 20.625H18ZM19.75 1.375C19.75 0.891751 19.3582 0.5 18.875 0.5C18.3918 0.5 18 0.891751 18 1.375H19.75ZM2.25 20.625C2.25 21.1082 2.64175 21.5 3.125 21.5C3.60825 21.5 4 21.1082 4 20.625H2.25ZM4 1.375C4 0.891751 3.60825 0.5 3.125 0.5C2.64175 0.5 2.25 0.891751 2.25 1.375H4ZM3.125 14.9375C4.81637 14.9375 6.1875 13.5664 6.1875 11.875H4.4375C4.4375 12.5999 3.84987 13.1875 3.125 13.1875V14.9375ZM6.1875 11.875C6.1875 10.1836 4.81637 8.8125 3.125 8.8125V10.5625C3.84987 10.5625 4.4375 11.1501 4.4375 11.875H6.1875ZM3.125 8.8125C1.43363 8.8125 0.0625 10.1836 0.0625 11.875H1.8125C1.8125 11.1501 2.40013 10.5625 3.125 10.5625V8.8125ZM0.0625 11.875C0.0625 13.5664 1.43363 14.9375 3.125 14.9375V13.1875C2.40013 13.1875 1.8125 12.5999 1.8125 11.875H0.0625ZM10.125 8.8125V20.625H11.875V8.8125H10.125ZM10.125 1.375V4.4375H11.875V1.375H10.125ZM12.3125 6.625C12.3125 7.34987 11.7249 7.9375 11 7.9375V9.6875C12.6914 9.6875 14.0625 8.31637 14.0625 6.625H12.3125ZM11 7.9375C10.2751 7.9375 9.6875 7.34987 9.6875 6.625H7.9375C7.9375 8.31637 9.30863 9.6875 11 9.6875V7.9375ZM9.6875 6.625C9.6875 5.90013 10.2751 5.3125 11 5.3125V3.5625C9.30863 3.5625 7.9375 4.93363 7.9375 6.625H9.6875ZM11 5.3125C11.7249 5.3125 12.3125 5.90013 12.3125 6.625H14.0625C14.0625 4.93363 12.6914 3.5625 11 3.5625V5.3125ZM18 17.5625V20.625H19.75V17.5625H18ZM18 1.375V13.1875H19.75V1.375H18ZM20.1875 15.375C20.1875 16.0999 19.5999 16.6875 18.875 16.6875V18.4375C20.5664 18.4375 21.9375 17.0664 21.9375 15.375H20.1875ZM18.875 16.6875C18.1501 16.6875 17.5625 16.0999 17.5625 15.375H15.8125C15.8125 17.0664 17.1836 18.4375 18.875 18.4375V16.6875ZM17.5625 15.375C17.5625 14.6501 18.1501 14.0625 18.875 14.0625V12.3125C17.1836 12.3125 15.8125 13.6836 15.8125 15.375H17.5625ZM18.875 14.0625C19.5999 14.0625 20.1875 14.6501 20.1875 15.375H21.9375C21.9375 13.6836 20.5664 12.3125 18.875 12.3125V14.0625ZM2.25 14.0625V20.625H4V14.0625H2.25ZM2.25 1.375V9.6875H4V1.375H2.25Z"
                          fill={activeTab === 'By Function' ? 'white' : 'black'}
                        ></path>
                      </svg>
                      <span>by Function</span>
                    </a>
                    <a
                      className={`flex items-center flex-shrink-0 px-5 py-3 space-x-2 dark:text-white-600 cursor-pointer ${
                        activeTab === 'By WCGA Guidelines'
                          ? 'border border-b-0 rounded-t-lg'
                          : ''
                      }`}
                      style={
                        activeTab === 'By WCGA Guidelines'
                          ? { backgroundColor: '#007bff', color: 'white' }
                          : { color: 'black' }
                      }
                      onClick={toggleTab}
                    >
                      <svg
                        width="40"
                        height="20"
                        viewBox="0 0 40 20"
                        fill="none"
                      >
                        <path
                          d="M9.47064 0.106445L12.8615 11.6349L16.2523 0.106445H18.7075H25.4456V1.25223L21.9841 7.21546C23.2 7.60583 24.1197 8.31532 24.7432 9.34393C25.3667 10.3731 25.6788 11.5807 25.6788 12.9679C25.6788 14.6836 25.2225 16.1256 24.3104 17.2943C23.3984 18.4631 22.2173 19.0477 20.7677 19.0477C19.6761 19.0477 18.7252 18.7009 17.915 18.0073C17.1043 17.3138 16.5043 16.3746 16.1145 15.1894L18.0316 14.3945C18.3125 15.1117 18.6828 15.6769 19.1427 16.0897C19.6025 16.503 20.1442 16.7091 20.7677 16.7091C21.4224 16.7091 21.9759 16.3428 22.4281 15.6104C22.8803 14.8774 23.1064 13.9971 23.1064 12.9673C23.1064 11.8292 22.8644 10.9484 22.3816 10.3248C21.8199 9.5924 20.939 9.22558 19.7385 9.22558H18.8035V8.10335L22.0772 2.44393H18.1252L17.9003 2.82664L13.094 19.0466H12.8603L9.3523 7.3079L5.84489 19.0466H5.61114L0 0.106445H2.45524L5.84607 11.6349L8.13763 3.87174L7.0154 0.106445H9.47064Z"
                          fill={
                            activeTab === 'By WCGA Guidelines'
                              ? 'white'
                              : 'black'
                          }
                        ></path>
                        <path
                          fill-rule="evenodd"
                          clip-rule="evenodd"
                          d="M38.2045 0.106445C37.7223 0.106445 37.2896 0.280138 36.9616 0.613391C36.6136 0.966664 36.4199 1.42356 36.4199 1.89577C36.4199 2.36798 36.6042 2.80545 36.9422 3.14871C37.2854 3.49668 37.7276 3.68568 38.2051 3.68568C38.672 3.68568 39.1248 3.49668 39.4775 3.15401C39.8155 2.82605 39.9997 2.38858 39.9997 1.89636C39.9997 1.41885 39.8107 0.971963 39.4828 0.638709C39.1389 0.290147 38.6915 0.106445 38.2045 0.106445ZM39.7607 1.91108C39.7607 2.32382 39.6011 2.70653 39.3085 2.98974C39 3.28825 38.6173 3.44722 38.1945 3.44722C37.7971 3.44722 37.4044 3.28354 37.1112 2.98503C36.8179 2.68651 36.6537 2.3038 36.6537 1.89636C36.6537 1.48892 36.8227 1.0909 37.1259 0.782962C37.4091 0.494456 37.7918 0.340783 38.2092 0.340783C38.6367 0.340783 39.0194 0.500344 39.3179 0.802981C39.6064 1.0909 39.7607 1.47832 39.7607 1.91108ZM38.254 0.84714H37.4886V2.87551H37.8713V2.01058H38.2493L38.662 2.87551H39.0895L38.6367 1.95112C38.9299 1.89106 39.0989 1.69264 39.0989 1.40413C39.0989 1.03614 38.821 0.84714 38.254 0.84714ZM38.1845 1.09561C38.5425 1.09561 38.7062 1.19511 38.7062 1.44358C38.7062 1.68204 38.5425 1.76683 38.1939 1.76683H37.8707V1.09561H38.1845Z"
                          fill={
                            activeTab === 'By WCGA Guidelines'
                              ? 'white'
                              : 'black'
                          }
                        ></path>
                        <path
                          d="M35.1923 0L35.5903 2.41815L34.1825 5.11185C34.1825 5.11185 33.642 3.96901 32.7441 3.33666C31.9875 2.8038 31.4947 2.68781 30.724 2.84679C29.7343 3.0511 28.612 4.23456 28.1222 5.69357C27.5363 7.43933 27.5304 8.28424 27.5098 9.06026C27.4768 10.3044 27.6729 11.0398 27.6729 11.0398C27.6729 11.0398 26.818 9.45828 26.8262 7.14199C26.8315 5.48867 27.0918 3.98962 27.8566 2.51C28.5296 1.20937 29.5299 0.428637 30.4178 0.336787C31.3358 0.241992 32.0611 0.684171 32.6217 1.16285C33.2105 1.66568 33.8051 2.76494 33.8051 2.76494L35.1923 0Z"
                          fill={
                            activeTab === 'By WCGA Guidelines'
                              ? 'white'
                              : 'black'
                          }
                        ></path>
                        <path
                          d="M35.3654 13.682C35.3654 13.682 34.7431 14.7942 34.3557 15.2229C33.9677 15.6515 33.2741 16.4063 32.4174 16.7837C31.5607 17.1611 31.1115 17.2324 30.2648 17.1511C29.4187 17.0699 28.6327 16.58 28.3571 16.3757C28.0816 16.1714 27.3774 15.5697 26.9794 15.0085C26.5813 14.4474 25.959 13.3252 25.959 13.3252C25.959 13.3252 26.3058 14.4498 26.523 14.9273C26.6479 15.2022 27.0318 16.0424 27.5764 16.7737C28.0845 17.4561 29.0713 18.6308 30.571 18.8957C32.0706 19.1613 33.101 18.4877 33.3559 18.3246C33.6109 18.1615 34.1484 17.7111 34.4887 17.3472C34.8438 16.9674 35.18 16.4829 35.366 16.192C35.502 15.98 35.7234 15.549 35.7234 15.549L35.3654 13.682Z"
                          fill={
                            activeTab === 'By WCGA Guidelines'
                              ? 'white'
                              : 'black'
                          }
                        ></path>
                      </svg>
                      <span>by WCGA Guidelines</span>
                    </a>
                  </div>
                </div>

                {activeTab === 'By WCGA Guidelines' ? (
                  <>
                    <IssueCategoryCard data={data} issueType="Errors" />
                    <IssueCategoryCard data={data} issueType="Warnings" />
                    <IssueCategoryCard data={data} issueType="Notices" />
                  </>
                ) : (<>
                  <IssueCategoryCard data={data} issueType="Function" />
                </>)}
              </div>
            </>
          }
        </div>
      )}
    </div>
  );
};

export default AccessibilityReport;
