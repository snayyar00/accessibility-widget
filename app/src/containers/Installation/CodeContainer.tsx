import React, { useState } from 'react';
import { FaExpand } from "react-icons/fa";
import { GrContract } from "react-icons/gr";
import { FaRegCopy } from "react-icons/fa6";

interface CodeProps {
  codeString: string;
}

export default function CodeContainer({ codeString }: CodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeString);
    setCopySuccess(true);
    setTimeout(()=> setCopySuccess(false), 2000);
    
  };

  // Only replace newline characters when not expanded
  const formattedCodeString = isExpanded ? codeString : codeString.replace(/\n/g, ' ');

  return (
    <div className="w-[80vw] sm:w-[90vw] mx-auto my-8 p-6 bg-white shadow-md rounded-lg flex flex-col border-2 border-dark-gray border-opacity-50">
      <h2 className="text-lg font-semibold mb-4">Quick installation</h2>
      <p className="text-sm mb-4">
        For best results, paste the installation code right before the ending of the body tag on your website.
      </p>
      <div className={`bg-sapphire-blue text-white rounded p-4 mb-4 ${isExpanded ? 'overflow-visible' : 'overflow-x-auto'}`}>
        <pre className={isExpanded ? 'whitespace-pre' : 'whitespace-nowrap'}>
          <code>{formattedCodeString}</code>
        </pre>
      </div>
      <div className='flex flex-row justify-between sm:flex-col-reverse'>

        <button
          className=" py-3 text-white text-center rounded bg-primary hover:bg-sapphire-blue w-[20%] sm:my-4 sm:w-full transition duration-300"
          onClick={copyToClipboard}
        >
          <FaRegCopy className='inline-block' size={20} /> 
          <span className='font-medium ml-1'> {copySuccess ? 'Copied!' : 'Copy to Clipboard'} </span>
        </button>

        <button
          className="px-1 py-1.5 text-sapphire-blue text-center rounded hover:bg-gray w-[10%] sm:w-[40%] sm:my-1 sm:self-end transition duration-300"
          onClick={toggleExpand}
        >
          {isExpanded ? <GrContract className='inline-block mr-1.5' /> : <FaExpand className='inline-block mr-1' />}
          <span className='my-0.5 inline-block'>
            {isExpanded ? 'Compress' : ` Expand`}
          </span>
        </button>

      </div>
    </div>
  );
}
