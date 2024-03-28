import AccordionGroup from '@mui/joy/AccordionGroup';
import Accordion from '@mui/joy/Accordion';
import AccordionDetails, {
  accordionDetailsClasses,
} from '@mui/joy/AccordionDetails';
import AccordionSummary, {
  accordionSummaryClasses,
} from '@mui/joy/AccordionSummary';
import React, { useEffect, useState } from 'react';
import AccessibilityIssuesGroup from './AccessibilityIssuesGroup';

function getObject(issueType: string, data: any) {
  if (issueType === 'Errors') {
    return data.getAccessibilityReport.htmlcs.errors;
  }
  if (issueType === 'Warnings') {
    return data.getAccessibilityReport.htmlcs.warnings;
  }
  if(issueType === 'Notices')
  {
    return data.getAccessibilityReport.htmlcs.notices;
  }
  return data.getAccessibilityReport.ByFunctions;
}

export default function IssueCategoryCard({ data, issueType }: any) {
  const [functionData,setFunctionData] = useState([]); 
  useEffect(()=>{
    if(issueType === "Function")
    {
      setFunctionData(data.getAccessibilityReport.ByFunctions);
    }
  },[])
  return (
    <>
      {issueType === 'Function' ? (
        <>
          {data?.getAccessibilityReport?.ByFunctions.map((func:any, index:any) => (
            <AccordionGroup>
              <Accordion
                key={index}
                defaultExpanded
                disabled
                variant="soft"
                sx={{
                  paddingTop: '0.5%',
                  backgroundColor: '#007bff',
                  borderRadius: 'md',
                  marginBottom: 3,
                }}
              >
                <AccordionSummary
                  indicator=""
                  sx={{ borderBottom: '1px solid #fff', marginBottom: '1%' }}
                  className="text-lg"
                >
                  {func['FunctionalityName']}
                </AccordionSummary>
                <AccordionDetails>
                  <AccordionGroup
                    className="bg-white"
                    sx={{
                      padding: '1%',
                      borderRadius: 'md',
                    }}
                  >
                    {func['Errors'] && (
                      <AccessibilityIssuesGroup issueObj={func['Errors']} />
                    )}
                  </AccordionGroup>
                </AccordionDetails>
              </Accordion>
            </AccordionGroup>
          ))}
        </>
      ) : (
        <AccordionGroup>
          <Accordion
            key={issueType}
            defaultExpanded
            disabled
            variant="soft"
            sx={{
              paddingTop: '0.5%',
              backgroundColor: '#007bff',
              borderRadius: 'md',
              marginBottom: 3,
            }}
          >
            <AccordionSummary
              indicator=""
              sx={{ borderBottom: '1px solid #fff', marginBottom: '1%' }}
              className="text-lg"
            >
              {issueType}
            </AccordionSummary>
            <AccordionDetails>
              <AccordionGroup
                className="bg-white"
                sx={{
                  padding: '1%',
                  borderRadius: 'md',
                }}
              >
                {data && (
                  <AccessibilityIssuesGroup
                    issueObj={getObject(issueType, data)}
                  />
                )}
              </AccordionGroup>
            </AccordionDetails>
          </Accordion>
        </AccordionGroup>
      )}
    </>
  );
}