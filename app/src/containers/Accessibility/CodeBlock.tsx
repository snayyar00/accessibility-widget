import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { okaidia } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { VscSparkle } from 'react-icons/vsc';
import { toast } from 'sonner';
import { CircularProgress } from '@mui/material';
import { getAuthenticationCookie } from '@/utils/cookie';

export default function CodeBlock({
  heading,
  description,
  help,
  element,
  index,
}: any) {
  const [correctedCode, setCorrectedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const askAi = async () => {
    setLoading(true);
    const url = `${process.env.REACT_APP_BACKEND_URL}/fix-with-ai`;
    const bodyData = {
      heading: heading,
      description: description,
      help: help,
      code: element,
    };

    const token = getAuthenticationCookie();

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(bodyData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        response.json().then((data) => {
          // Handle the JSON data received from the backend
          setCorrectedCode(data?.correctedCode);
          setLoading(false);
        });
      })
      .catch((error) => {
        // Handle error
        setLoading(false);
        toast.error('We have run into an error :( Please Try Again Later');
        console.error('There was a problem with the fetch operation:', error);
      });
  };

  return (
    <>
      <SyntaxHighlighter
        key={index}
        language="javascript"
        style={okaidia}
        renderer={({ rows, stylesheet, useInlineStyles }) => (
          <>
            {correctedCode != '' ? null : (
              <div className="relative inline-block mr-5">
                <div className="absolute inset-0 bg-gradient-to-r from-[#40e0d0] via-[#9370db] to-[#ff8c00] rounded-full blur-sm" />
                <button
                  disabled={loading}
                  onClick={askAi}
                  className={`
                            relative bg-[#0f0a19] text-white font-medium py-2 px-6 rounded-full
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f0a19] focus:ring-white
                            
                          `}
                  aria-label="Write with AI"
                >
                  {loading ? (
                    <CircularProgress
                      size={20}
                      sx={{ color: 'white', marginBottom: '-4px' }}
                      className="m-auto"
                    />
                  ) : (
                    <>
                      <span className="relative z-10 flex items-center justify-center">
                        <VscSparkle />
                        Ask AI
                      </span>
                      <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#40e0d0] via-[#9370db] to-[#ff8c00] opacity-20" />
                      <span className="absolute inset-[1px] rounded-full bg-[#0f0a19]" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Render Button above code */}

            {/* Render code lines */}
            {rows.map((node, i) => (
              <span key={i}>
                {/* Render each child text or map over children if it’s an array */}
                {node.children?.map((child, j) =>
                  typeof child === 'string' ? (
                    child
                  ) : (
                    <span key={j}>
                      {child.value ??
                        child.children
                          ?.map((grandChild) => grandChild.value || '')
                          .join('')}
                    </span>
                  ),
                )}
              </span>
            ))}
          </>
        )}
      >
        {element}
      </SyntaxHighlighter>

      {correctedCode != '' ? (
        <>
          <h4 className="text-xs font-medium text-dark-gray p-1.5 mt-0.5">
            AI Suggestion
          </h4>
          <SyntaxHighlighter
            language="javascript"
            wrapLongLines
            style={okaidia}
          >
            {correctedCode}
          </SyntaxHighlighter>
        </>
      ) : null}
    </>
  );
}
