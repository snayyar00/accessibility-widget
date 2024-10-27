import React, { useState } from "react";
import Accordion from '@mui/joy/Accordion';
import AccordionDetails from '@mui/joy/AccordionDetails';
import AccordionSummary from '@mui/joy/AccordionSummary';
import AccordionCard from './AccordionCard';

type ErrorDetail = {
  code: string;
  context: string[];
  description: string;
  message: string;
  recommended_action: string;
  selectors: string[];
  __typename: string;
};

type AccessibilityErrors = {
  expand: boolean;
} & {
  [key: string]: ErrorDetail[];
};

const firstIndex = 0;

export default function AccessibilityIssuesGroup({ issueObj, expand }: AccessibilityErrors) {
  // Use an object to manage the expansion state of each accordion individually
  const [expandedStates, setExpandedStates] = useState<{ [key: string]: boolean }>({});

  const handleToggle = (key: string) => {
    setExpandedStates((prevState) => ({
      ...prevState,
      [key]: !prevState[key],
    }));
  };

  return (
    <>
      {Object.entries(issueObj).map(([key, issues]) => {
        const errorDetails: ErrorDetail[] = Array.isArray(issues) ? issues : [issues];

        if (errorDetails.length === 0) {
          return null; // skip if no issues
        }

        return (
          <Accordion
            key={key}
            expanded={expandedStates[key] || expand}
            onChange={() => handleToggle(key)}
          >
            <AccordionSummary
              className="text-sm font-medium p-1"
              sx={{
                paddingY: 1,
              }}
            >
              {errorDetails[firstIndex].code}
            </AccordionSummary>
            {errorDetails.map((issue, index) => (
              <AccordionDetails key={index}>
                <AccordionCard
                expand={expand}
                  heading={issue.message}
                  description={issue.description}
                  help={issue.recommended_action}
                  elements={issue.context}
                />
              </AccordionDetails>
            ))}
          </Accordion>
        );
      })}
    </>
  );
}
