import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import React from 'react';

export default function AccordionCard({ heading, noOfFails, items }: any) {
  console.log('from accordion card', items)
  return (<Accordion
    variant="elevation"
    sx={{ width: '100%', padding: '0.75%' }}
  >
    <AccordionSummary
      aria-controls="panel2-content"
      id="panel2-header"
    >
      <Typography className='flex justify-between w-full'>{heading} <span className="fail-count text-bold">{noOfFails} Fail</span></Typography>

    </AccordionSummary>
    <AccordionDetails>
      {
        Object.keys(items).map((obj) => {
          const currentItem = items[obj];
          return (
            <Accordion
              sx={{ width: '100%', margin: 'auto', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', background: '#F3F5F9' }}
              className='accordion bg-light-grey shadow-xl'
            >
              <AccordionSummary
                aria-controls="panel2-content"
                id="panel2-header"
              >
                <Typography className='flex justify-between w-full'>{currentItem.description} <span className="fail-count text-bold">{currentItem.count} Fail</span></Typography>
              </AccordionSummary>
              {currentItem.xpaths && <AccordionDetails>
                <Typography variant="body1">XPath of the element</Typography>
                {
                  currentItem.xpaths.map((xpath: string) =>
                    <Typography variant="subtitle2">
                      {xpath}
                    </Typography>

                  )
                }
              </AccordionDetails>}
            </Accordion>
          )
        }
        )
      }
    </AccordionDetails>
    {/* <AccordionDetails>
            <Typography>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
                malesuada lacus ex, sit amet blandit leo lobortis eget.
            </Typography>
        </AccordionDetails>
        <Accordion
            sx={{ width: '100%', margin: 'auto', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', background: '#F3F5F9' }}
            className='accordion bg-light-grey shadow-xl'
        >
            <AccordionSummary
                aria-controls="panel2-content"
                id="panel2-header"
            >
                <Typography>Accordion 2</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Typography>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
                    malesuada lacus ex, sit amet blandit leo lobortis eget.
                </Typography>
            </AccordionDetails>
        </Accordion> */}
  </Accordion>)
}