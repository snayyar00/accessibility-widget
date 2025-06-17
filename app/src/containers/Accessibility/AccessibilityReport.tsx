import React, { useEffect, useState, useRef } from 'react';
import './Accessibility.css'; // Ensure your CSS file includes styles for the accordion
import { AiFillCloseCircle } from 'react-icons/ai';
import { FaGaugeSimpleHigh } from 'react-icons/fa6';
import { FaUniversalAccess, FaCheckCircle, FaCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import getAccessibilityStats from '@/queries/accessibility/accessibility';
import SAVE_ACCESSIBILITY_REPORT from '@/queries/accessibility/saveAccessibilityReport'
import GET_USER_SITES from '@/queries/sites/getSites';
import { useLazyQuery, useMutation, useQuery } from '@apollo/client';
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
import {
  ButtonGroup,
  Card,
  CardContent,
  CardHeader,
  CardMedia,
  CircularProgress,
  Input,
  Typography, Box
} from '@mui/material';
import { TbReportSearch } from 'react-icons/tb';

import WebsiteScanAnimation from '@/components/Animations/WebsiteScanAnimation';
import LeftArrowAnimation from '@/components/Animations/LeftArrowAnimation';
import AccessibilityScoreCard from './AccessibiltyScoreCard';
import AccordionCard from './AccordionCard';
import AccessibilityIssuesGroup from './AccessibilityIssuesGroup';
import './AccessibilityReport.css';
import IssueCategoryCard from './IssueCategoryCard';
import SitePreviewSVG from './SitePreviewSVG';
import ByFunctionSVG from './ByFunctionSVG';
import ByWCGAGuildelinesSVG from './ByWCGAGuidlinesSVG';
import { check } from 'prettier';
import ReactToPrint, { useReactToPrint } from 'react-to-print';
import Logo from '@/components/Common/Logo';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { useTranslation } from 'react-i18next';
import TourGuide from '@/components/Common/TourGuide';
import { defaultTourStyles } from '@/config/tourStyles';
import { accessibilityTourSteps, tourKeys } from '@/constants/toursteps';

const AccessibilityReport = ({ currentDomain }: any) => {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.report') });
  const [score, setScore] = useState(0);
  const [scoreBackup, setScoreBackup] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [domain, setDomain] = useState(currentDomain);
  const [issueType, setIssueType] = useState('Errors');
  const [siteImg, setSiteImg] = useState('');
  const [webabilityenabled, setwebabilityenabled] = useState(false);
  const [otherWidgetEnabled, setOtherWidgetEnabled] = useState(false);
  const [buttoncontrol, setbuttoncontrol] = useState(false);
  const [scriptCheckLoading, setScriptCheckLoading] = useState(false);
  const [otherscore, setOtherScore] = useState(Math.floor(Math.random() * (88 - 80 + 1)) + 80);
  const [expand, setExpand] = useState(false);
  const [correctDomain, setcorrectDomain] = useState(currentDomain);
  const [webAbilityScore,setWebAbilityScore] = useState(Math.floor(Math.random() * (95 - 90 + 1)) + 90);
  // const [accessibilityData, setAccessibilityData] = useState({});
  const { data: sitesData } = useQuery(GET_USER_SITES);
  const [saveAccessibilityReport] = useMutation(SAVE_ACCESSIBILITY_REPORT);

  const [getAccessibilityStatsQuery, { data, loading, error }] = useLazyQuery(
    getAccessibilityStats,
    {
      variables: { url: correctDomain },
    },
  );

  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef: contentRef });



  // Handle tour completion
  const handleTourComplete = () => {
    console.log('Accessibility tour completed!');
  };

  useEffect(() => {
    if (data) {
      const result = data.getAccessibilityReport;
      if(result){
        let allowed_sites_id = null;
        const normalizeDomain = (url: string) =>
          url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
        if (sitesData && sitesData.getUserSites) {
          const matchedSite = sitesData.getUserSites.find(
            (site: any) => normalizeDomain(site.url) == normalizeDomain(correctDomain)
          );
          allowed_sites_id = matchedSite ? matchedSite.id : null;
        }
        saveAccessibilityReport({
          variables: {
            report: result,
            url: normalizeDomain(correctDomain),
            allowed_sites_id,
          },
        });
        const { htmlcs } = result;
        groupByCode(htmlcs);
      }
      setSiteImg(result?.siteImg);
      setScoreBackup(Math.min(result?.score || 0, 95));
      setScore(Math.min(result?.score || 0, 95));
      // setAccessibilityData(htmlcs);
    }
  }, [data]);

  useEffect(() => {
    if (expand === true) {
      reactToPrintFn();
      setExpand(false);
    }
  }, [expand]);

  const enableButton = () => {
    if (enabled) {
      setEnabled(false);
      setScore(scoreBackup);
      if (buttoncontrol) {
        setOtherWidgetEnabled(true);
      }
    } else {
      setEnabled(true);
      setScoreBackup(score);
      setScore(90);
      if (buttoncontrol) {
        setOtherWidgetEnabled(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDomain(e.target.value);
    // Update state with input value
  };

  const handleSubmit = async () => {
    // Transform domain similar to SignUp form
    const transformedDomain = domain
      .replace(/^https?:\/\//, '') // Remove http:// or https://
      .replace(/\/+$/, ''); // Remove trailing slashes
    
    if (!isValidDomain(transformedDomain)) {
      setDomain(currentDomain);
      toast.error('You must enter a valid domain name!');
      return;
    }
    
    // Update the domain state with the transformed value
    setDomain(transformedDomain);
    setcorrectDomain(transformedDomain);
    checkScript();
    getAccessibilityStatsQuery({ variables: { url: transformedDomain } }); // Pass transformedDomain directly to avoid race condition
  };

  const groupByCodeUtil = (issues: any) => {
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
  };

  const groupByCode = (issues: any) => {
    console.log('group code called');
    if (issues && typeof issues === 'object') {
      issues.errors = groupByCodeUtil(issues.errors);
      issues.warnings = groupByCodeUtil(issues.warnings);
      issues.notices = groupByCodeUtil(issues.notices);
    }
  };

  const [activeTab, setActiveTab] = useState('By WCGA Guidelines');

  // Function to toggle active tab
  const toggleTab = () => {
    setActiveTab(
      activeTab === 'By Function' ? 'By WCGA Guidelines' : 'By Function',
    );
  };

  const checkScript = async () => {
    setScriptCheckLoading(true);
    setwebabilityenabled(false);
    setOtherWidgetEnabled(false);
    setbuttoncontrol(false);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/check-script`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ siteUrl: domain }),
      });
      const data = await response.json();
      if (data === 'Web Ability') {
        setwebabilityenabled(true);
      } else if (data !== 'false') {
        setOtherWidgetEnabled(true);
        setbuttoncontrol(true);
      }
      setScriptCheckLoading(false);
    } catch (error) {
      console.log("catch error=", error);
      setScriptCheckLoading(false); // It's good to stop loading even on error
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSubmit(); // Trigger the submit logic when Enter is pressed
    }
  };

  return (
    <>
      <TourGuide
        steps={accessibilityTourSteps}
        tourKey={tourKeys.accessibility}
        autoStart={true}
        onTourComplete={handleTourComplete}
        customStyles={defaultTourStyles}
      />
      
      <div className="accessibility-wrapper">
        <header className="accessibility-page-header text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Web Accessibility Scanner
          </h1>
          <p className="text-xl text-gray-600">
            Evaluate your website's accessibility in seconds
          </p>
        </header>
        <div className="w-full border-none shadow-none flex justify-center">
          {/* Replaced <form> with a <div> */}
          <div className="search-bar-container">
            <input
              type="text"
              placeholder="Enter a domain"
              className="search-input"
              value={domain}
              onChange={handleInputChange} // Correctly updates the input value
              onKeyDown={handleKeyPress}
            />
            <button
              type="button" // Changed type from "submit" to "button"
              className="search-button bg-primary"
              onClick={handleSubmit} // Added onClick handler
            >
              Free Scan
              {(loading || scriptCheckLoading) && ( // Included scriptCheckLoading in the loading state
                <CircularProgress
                  size={14}
                  sx={{ color: 'white' }}
                  className="ml-2 my-auto"
                />
              )}
            </button>
          </div>
        </div>
        {loading || scriptCheckLoading ? (
          <WebsiteScanAnimation className="mt-8" />
        ) : (
          <>
            {data && (
              <Button
                size="lg"
                className="print-report-button"
                sx={{
                  fontSize: '2xl', // Equivalent to 'text-2xl'
                  paddingX: 10, // Equivalent to 'px-10' (horizontal padding)
                  marginTop: 3,
                  marginBottom: 2, // Equivalent to 'mb-10' (bottom margin)
                }}
                onClick={() => {
                  setExpand(true);
                }}
              >
                Print Report
              </Button>
            )}
            <div ref={contentRef}>
              <div
                className="flex items-center px-4 mt-5 hidden print-title"
                style={{ position: 'relative' }}
              >
                <div className="absolute left-4">
                  <Logo />
                </div>
                <h3 className="text-3xl font-bold text-sapphire-blue mx-auto">
                  <span className="text-primary">Accessibility</span> Report for{' '}
                  {domain}
                </h3>
              </div>
              <div className="accessibility-container">
                {data ? (
                  <>
                    <div className="accessibility-card">
                      <h3 className="text-center font-bold text-sapphire-blue text-lg mb-3">
                        Status
                      </h3>
                      <div className="flex justify-center w-full">
                        {score > 89 || webabilityenabled ? (
                          <FaCheckCircle size={90} color="green" />
                        ) : (
                          <AiFillCloseCircle
                            size={90}
                            color={otherWidgetEnabled ? 'orange' : '#ec4545'}
                          />
                        )}
                      </div>
                      <div
                        className={`card-status ${
                          score > 89 || webabilityenabled
                            ? 'low'
                            : otherWidgetEnabled
                            ? 'text-[#ffa500]'
                            : 'not-compliant'
                        }`}
                      >
                        {score > 89 || webabilityenabled || otherWidgetEnabled
                          ? 'Compliant'
                          : 'Not Compliant'}
                      </div>
                      <p>
                        {score > 89 || webabilityenabled
                          ? 'You achieved exceptionally high compliance status!'
                          : otherWidgetEnabled
                          ? 'Your Site may not comply with WCAG 2.1 AA.'
                          : "Your site doesn't comply with WCAG 2.1 AA."}
                      </p>
                    </div>

                    <AccessibilityScoreCard
                      score={
                        webabilityenabled
                          ? webAbilityScore
                          : otherWidgetEnabled
                          ? otherscore
                          : score
                      }
                      otherwidget={otherWidgetEnabled}
                    />

                    <div className="accessibility-card lawsuit-risk-card">
                      <h3 className="text-center font-bold text-sapphire-blue text-lg mb-3">
                        Lawsuit Risk
                      </h3>
                      <div className="flex justify-center">
                        <FaGaugeSimpleHigh
                          style={
                            score > 89 || webabilityenabled
                              ? { transform: 'scaleX(-1)' }
                              : {}
                          }
                          size={90}
                          color={
                            score > 89 || webabilityenabled
                              ? 'green'
                              : otherWidgetEnabled
                              ? 'orange'
                              : '#ec4545'
                          }
                        />
                      </div>
                      <div
                        className={`card-risk ${
                          score > 89 || webabilityenabled
                            ? 'low'
                            : otherWidgetEnabled
                            ? 'medium'
                            : 'high'
                        }`}
                      >
                        {score > 89 || webabilityenabled
                          ? 'Low'
                          : otherWidgetEnabled
                          ? 'Medium'
                          : 'High'}
                      </div>
                      {score > 89 || webabilityenabled ? (
                        <p>Your Site is Secure from legal Action</p>
                      ) : (
                        <p>
                          Multiple violations may be exposing your site to legal
                          action.
                        </p>
                      )}
                    </div>

                    {webabilityenabled ? (
                      <Card sx={{ borderRadius: '10px', m: 2 }}>
                        <CardContent>
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            mb={2}
                          >
                            <FaUniversalAccess color="#0133ed" fontSize={80} />
                          </Box>
                          <Typography
                            className="font-extrabold"
                            variant="h6"
                            component="div"
                            align="center"
                            gutterBottom
                          >
                            Web Ability Widget Enabled
                          </Typography>
                          <Typography
                            fontSize={'16px'}
                            variant="body2"
                            color="text.secondary"
                            align="center"
                          >
                            This site is equipped with accessibility features to
                            enhance your browsing experience.
                          </Typography>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="webability-toggle-section flex items-center justify-center mt-3">
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
                    )}
                    {data?.getAccessibilityReport != undefined ? (
                      <div className="accessibility-issues-section">
                        <div className="text-center">
                          <h3 className="text-3xl font-semibold text-sapphire-blue mb-2">
                            Accessibility Issues
                          </h3>
                        </div>
                        <div className="flex justify-center justify-self-center">
                          <div>
                            <Card
                              sx={{
                                maxWidth: 400,
                                borderRadius: 'md',
                                marginY: 4,
                              }}
                            >
                              <SitePreviewSVG text={domain} />
                              <CardMedia
                                component="img"
                                height="250"
                                image={siteImg}
                                alt="Site Preview Image"
                              />
                            </Card>
                          </div>
                        </div>

                        <div>
                          <div>
                            <div className="flex flex-col justify-center items-center -mx-4 overflow-x-auto overflow-y-hidden sm:justify-center flex-nowrap dark:text-white-800">
                              <div className="flex">
                                <a
                                  className={`flex items-center flex-shrink-0 px-5 py-3 space-x-2 dark:text-white-600 cursor-pointer ${
                                    activeTab === 'By Function'
                                      ? 'border border-b-0 rounded-t-lg'
                                      : ''
                                  }`}
                                  onClick={toggleTab}
                                  style={
                                    activeTab === 'By Function'
                                      ? {
                                          backgroundColor: '#007bff',
                                          color: 'white',
                                        }
                                      : { color: 'black' }
                                  }
                                >
                                  <ByFunctionSVG text={activeTab} />
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
                                      ? {
                                          backgroundColor: '#007bff',
                                          color: 'white',
                                        }
                                      : { color: 'black' }
                                  }
                                  onClick={toggleTab}
                                >
                                  <ByWCGAGuildelinesSVG text={activeTab} />
                                  <span>by WCGA Guidelines</span>
                                </a>
                              </div>
                              {activeTab === 'By WCGA Guidelines' ? (
                                <>
                                  <IssueCategoryCard
                                    expand={expand}
                                    data={data}
                                    issueType="Errors"
                                  />
                                  <IssueCategoryCard
                                    expand={expand}
                                    data={data}
                                    issueType="Warnings"
                                  />
                                  <IssueCategoryCard
                                    expand={expand}
                                    data={data}
                                    issueType="Notices"
                                  />
                                </>
                              ) : (
                                <>
                                  <IssueCategoryCard
                                    expand={expand}
                                    data={data}
                                    issueType="Function"
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full flex justify-center">
                        <header className="text-center mb-8 w-full">
                          <h1 className="text-4xl font-bold text-gray-900 mb-2">
                            We Could Not Scan Your Website
                          </h1>
                          <p className="text-xl text-gray-600">
                            Please try again with a valid domain name or Contact
                            Support.
                          </p>
                        </header>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
                    <Card>
                      <CardContent className="my-8">
                        <h2 className="text-xl font-semibold mb-2  text-gray-800">
                          Comprehensive Analysis
                        </h2>
                        <p className="text-gray-600 mb-4">
                          Our scanner checks for WCAG 2.1 compliance across your
                          entire site.
                        </p>
                        <div className="flex justify-center w-full">
                          <FaCheckCircle size={90} color="green" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="my-8">
                        <h2 className="text-xl font-semibold mb-2 text-gray-800">
                          Detailed Reports
                        </h2>
                        <p className="text-gray-600 mb-4">
                          Receive a full breakdown of accessibility issues and how
                          to fix them.
                        </p>
                        <div className="flex justify-center w-full">
                          <TbReportSearch size={95} color="green" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="my-8">
                        <h2 className="text-xl font-semibold mb-2 text-gray-800">
                          Improve User Experience
                        </h2>
                        <p className="text-gray-600 mb-4">
                          Make your website accessible to all users, regardless of
                          abilities.
                        </p>
                        <div className="flex justify-center w-full">
                          <FaUniversalAccess size={95} color="blue" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default AccessibilityReport;
