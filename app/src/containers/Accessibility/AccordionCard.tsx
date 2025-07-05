import Accordion, {accordionClasses} from "@mui/joy/Accordion";
import AccordionDetails, { accordionDetailsClasses } from "@mui/joy/AccordionDetails";
import AccordionGroup from "@mui/joy/AccordionGroup";
import AccordionSummary, { accordionSummaryClasses } from "@mui/joy/AccordionSummary";
import React, { useState } from 'react';
import CodeBlock from "./CodeBlock";

export default function AccordionCard({ heading, noOfFails, description, selectors, help, elements, expand, screenshotUrl }: any) {
  const [expanded, setExpanded] = useState(false);


  return (
    <AccordionGroup
      variant="outlined"
      transition="0.2s"
      sx={{
        borderRadius: 'lg',
        [`& .${accordionSummaryClasses.button}:hover`]: {
          bgcolor: 'transparent',
        },
        [`& .${accordionDetailsClasses.content}`]: {
          boxShadow: (theme) => `inset 0 1px ${theme.vars.palette.divider}`,
          [`&.${accordionDetailsClasses.expanded}`]: {
            paddingBlock: '0.75rem',
          },
          [`& .${accordionClasses.root}.${accordionClasses.expanded}`]: {
            bgcolor: 'background.level5 ',
            borderRadius: 'md',
            borderBottom: '1px solid',
            borderColor: 'background.level2',
          },
        },
      }}
    >
      <Accordion expanded={expanded || expand} onChange={() => setExpanded(!expanded)}>
        <AccordionSummary
          indicator=""
          sx={{
            backgroundColor: '#f0f4f8',
            borderRadius: expanded ? '12px 12px 0 0' : 'lg',
          }}
        >
          {heading}
        </AccordionSummary>
        <AccordionDetails variant="soft">
          <h4 className="text-xs font-medium text-dark-gray p-1.5">
            Description
          </h4>
          <p className="m-1.5">{description}</p>
          {elements && elements[0] ? (
            <>
            
              {elements.map((element: any, index: any) => (
                <><h4 className="text-xs font-medium text-dark-gray p-1.5 mt-0.5">
                Code Snippet
              </h4>
              <CodeBlock heading={heading} description={description} help={help} key={index} element={element} index={index}/>
              </>
                ))}
            </>
          ) : null}

          {selectors && selectors.length > 0 && (
            <>
              <h4 className="text-xs font-medium text-dark-gray p-1.5 mt-0.5">
                CSS Selector
              </h4>
              <div className="m-1.5">
                {selectors.map((selector: string, index: number) => (
                  <code key={index} className="block bg-gray-100 p-2 rounded text-sm font-mono mb-1">
                    {selector}
                  </code>
                ))}
              </div>
            </>
          )}

          {screenshotUrl && (
            <>
              <h4 className="text-xs font-medium text-dark-gray p-1.5 mt-0.5">
                Screenshot
              </h4>
              <div className="m-1.5">
                <img 
                  src={screenshotUrl} 
                  alt="Accessibility issue screenshot" 
                  className="max-w-full h-auto rounded border"
                  style={{ maxHeight: '300px' }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    View full screenshot
                  </a>
                </p>
              </div>
            </>
          )}

          <h4 className="text-xs font-medium text-dark-gray p-1.5 mt-0.5">
            Recommended Action
          </h4>
          <p className="m-1.5">{help}</p>
        </AccordionDetails>
      </Accordion>
    </AccordionGroup>
  );
}