import React, { useEffect, useState } from 'react';
import './Accessibility.css'; // Make sure your CSS file is updated with the styles for the accordion
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import { AiFillCloseCircle } from "react-icons/ai";
import { FaGaugeSimpleHigh } from "react-icons/fa6";
import { FaCheckCircle } from "react-icons/fa";
import { Link } from 'react-router-dom';
import getAccessibilityStats from '@/queries/accessibility/accessibility';
import { useQuery } from '@apollo/client';
import AccessibilityScoreCard from './AccessibiltyScoreCard';
import AccessibilityReport from './AccessibilityReport';





const Accessibility = () => 
  

  (

    <div>
      <AccessibilityReport currentDomain=''/>
    </div>
  );


export default Accessibility;
