import React from "react";
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
  [key: string]: ErrorDetail[];
};
const firstIndex = 0;

export default function AccessibilityIssuesGroup({ issueObj }: AccessibilityErrors) {
  console.log('issueOBJ',issueObj)
  return <>
    {Object.entries(issueObj).map(([key, issues]) => {
      const errorDetails: ErrorDetail[] = Array.isArray(issues) ? issues : [issues];

      if (errorDetails.length === 0) {
        return null; // skip if no issues
      }

      return (
        <Accordion key={key}>
          <AccordionSummary
            className="text-sm font-medium p-1"
            sx={{
              paddingY: 1,
            }}
          >
            {errorDetails[firstIndex].code}
          </AccordionSummary>
          {errorDetails.map((issue, index) => (
            <AccordionDetails >
              <AccordionCard
                heading={issue.message}
                description={issue.description}
                help={issue.recommended_action}
                elements={issue.context}
                key={issue.message}
              />
            </AccordionDetails>
          ))}
        </Accordion>
      );
    })}
  </>

}
