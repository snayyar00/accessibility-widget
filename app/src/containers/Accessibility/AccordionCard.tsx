import Accordion, {accordionClasses} from "@mui/joy/Accordion";
import AccordionDetails, { accordionDetailsClasses } from "@mui/joy/AccordionDetails";
import AccordionGroup from "@mui/joy/AccordionGroup";
import AccordionSummary, { accordionSummaryClasses } from "@mui/joy/AccordionSummary";
import React, { useState } from 'react';
import CodeBlock from "./CodeBlock";

export default function AccordionCard({ heading, noOfFails, description, selectors, help,elements }: any) {
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
      <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
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
          {elements[0] ? (
            <>
              <h4 className="text-xs font-medium text-dark-gray p-1.5 mt-0.5">
                Code Snippet
              </h4>

              {elements.map((element: any, index: any) => (
                <CodeBlock heading={heading} description={description} help={help} key={index} element={element} index={index}/>
              ))}
            </>
          ) : null}

          <h4 className="text-xs font-medium text-dark-gray p-1.5 mt-0.5">
            Recommended Action
          </h4>
          <p className="m-1.5">{help}</p>
        </AccordionDetails>
      </Accordion>
    </AccordionGroup>
  );
}