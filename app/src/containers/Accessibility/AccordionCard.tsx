import Accordion, {accordionClasses} from "@mui/joy/Accordion";
import AccordionDetails, { accordionDetailsClasses } from "@mui/joy/AccordionDetails";
import AccordionGroup from "@mui/joy/AccordionGroup";
import AccordionSummary, { accordionSummaryClasses } from "@mui/joy/AccordionSummary";
import React, { useState } from 'react';
import CodeBlock from "./CodeBlock";

export default function AccordionCard({ heading, noOfFails, description, selectors, help, elements, expand, screenshotUrl, helpUrl, wcagLevel, runner, impact }: any) {
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
          <div className="flex items-center justify-between w-full">
            <span>{heading}</span>
            <div className="flex items-center gap-2">
              {wcagLevel && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  WCAG {wcagLevel}
                </span>
              )}
              {runner && runner === 'webability' && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                  WebAbility
                </span>
              )}
              {impact && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  impact === 'critical' ? 'bg-red-100 text-red-700' :
                  impact === 'serious' ? 'bg-orange-100 text-orange-700' :
                  impact === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {impact}
                </span>
              )}
            </div>
          </div>
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
              <h4 className="text-xs font-medium text-dark-gray p-1.5 mt-0.5 flex items-center gap-1">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                CSS Selector
              </h4>
              <div className="m-1.5">
                {selectors.map((selector: string, index: number) => (
                  <code key={index} className="block bg-gray-100 p-2 rounded text-sm font-mono mb-1 border border-gray-200">
                    {selector}
                  </code>
                ))}
              </div>
            </>
          )}

          {screenshotUrl && (
            <>
              <h4 className="text-xs font-medium text-dark-gray p-1.5 mt-0.5 flex items-center gap-1">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Visual Evidence (WebAbility Enhanced)
              </h4>
              <div className="m-1.5 p-2 bg-purple-50 rounded-lg border border-purple-200">
                <img 
                  src={screenshotUrl} 
                  alt="Accessibility issue screenshot" 
                  className="max-w-full h-auto rounded border-2 border-purple-300 shadow-md"
                  style={{ maxHeight: '300px' }}
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-purple-700">
                    WebAbility captured this violation
                  </p>
                  <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View full screenshot
                  </a>
                </div>
              </div>
            </>
          )}

          <h4 className="text-xs font-medium text-dark-gray p-1.5 mt-0.5">
            Recommended Action
          </h4>
          <p className="m-1.5">{help}</p>
          
          {helpUrl && (
            <div className="m-1.5 mt-3">
              <a 
                href={helpUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Learn more about this WCAG requirement
              </a>
            </div>
          )}
        </AccordionDetails>
      </Accordion>
    </AccordionGroup>
  );
}