import type React from 'react';
import { useState } from 'react';
import { ReactComponent as LogoIcon } from '@/assets/images/svg/logo.svg';
import { FaDroplet, FaGear, FaRotateRight, FaX } from 'react-icons/fa6';
import { FaAccessibleIcon, FaBookReader, FaChevronDown, FaFont, FaLink, FaMicrophone, FaMouse, FaPuzzlePiece, FaRegSun, FaUniversalAccess } from 'react-icons/fa';
import { Colors, Toggles } from './CustomizeWidget';
import { LuAudioWaveform } from "react-icons/lu";
import { MdGradient, MdMonochromePhotos, MdMotionPhotosPause } from 'react-icons/md';
import { TbBrain, TbCircleHalf2 } from 'react-icons/tb';

interface AccessibilityMenuProps {
  colors: Colors;
  toggles: Toggles;
  selectedFont: string;
}

const AccessibilityMenu: React.FC<AccessibilityMenuProps> = ({
  colors,
  toggles,
  selectedFont,
}) => {
  const [fontSize, setFontSize] = useState(100);
  const [showProfiles, setShowProfiles] = useState(false);

  const fontStyle = { fontFamily: selectedFont };

  const accessibilityProfiles = [
    {
      id: 'motorImpaired',
      name: 'Motor Impaired',
      icon: (
        <FaAccessibleIcon size={40} />
      ),
    },
    {
      id: 'blind',
      name: 'Blind',
      icon: (
        <LuAudioWaveform size={40}/>
      ),
    },
    {
      id: 'colorBlind',
      name: 'Color Blind',
      icon: (
       <FaDroplet size={40} />
      ),
    },
    {
      id: 'dyslexia',
      name: 'Dyslexia',
      icon: (
        <div
          className="w-12 h-12 flex items-center justify-center text-2xl font-bold"
          style={fontStyle}
        >
          Df
        </div>
      ),
    },
    {
      id: 'visuallyImpaired',
      name: 'Visually-Impaired',
      icon: (
        <svg viewBox="0 0 24 24" className="w-12 h-12" style={fontStyle}>
          <path
            fill="currentColor"
            d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
          />
        </svg>
      ),
    },
    {
      id: 'cognitiveAndLearning',
      name: 'Cognitive & Learning',
      icon: (
        <FaPuzzlePiece size={40} />
      ),
    },
    {
      id: 'seizureAndEpileptic',
      name: 'Seizure & Epileptic',
      icon: (
        <TbBrain size={40} />
      ),
    },
    {
      id: 'adhd',
      name: 'ADHD',
      icon: (
        <svg viewBox="0 0 24 24" className="w-12 h-12" style={fontStyle}>
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle
            cx="12"
            cy="12"
            r="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      ),
    },
  ];

  const ToolButtons = [
    {
      id: 'darkMode',
      name: 'Dark Mode',
      icon: (
        <svg viewBox="0 0 24 24" className="w-12 h-12" style={fontStyle}>
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path d="M12 2v20" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2a10 10 0 010 20" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'screenReader',
      name: 'Screen Reader',
      icon: (
        <LuAudioWaveform size={40}/>
      ),
    },
    {
      id: 'readingGuide',
      name: 'Reading Guide',
      icon: (
        <FaBookReader size={40}/>
      ),
    },
    {
      id: 'stopAnimations',
      name: 'Stop Animations',
      icon: (
        <MdMotionPhotosPause size={40}/>
      ),
    },
    {
      id: 'bigCursor',
      name: 'Big Cursor',
      icon: (
       <FaMouse size={40}/>
      ),
    },
    {
      id: 'voiceNavigation',
      name: 'Voice Navigation',
      icon: (
       <FaMicrophone size={40}/>
      ),
    },
  ];

  const colorAdjustments = [
    {
      id: 'darkContrast',
      name: 'Dark Contrast',
      icon: (
        <svg viewBox="0 0 24 24" className="w-12 h-12" style={fontStyle}>
          <circle cx="12" cy="12" r="10" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'lightContrast',
      name: 'Light Contrast',
      icon: (
       <FaRegSun size={40} />
      ),
    },
    {
      id: 'highContrast',
      name: 'High Contrast',
      icon: (
        <TbCircleHalf2 size={40} />
      ),
    },
    {
      id: 'highSaturation',
      name: 'High Saturation',
      icon: (
        <svg viewBox="0 0 24 24" className="w-12 h-12" style={fontStyle}>
          <path
            fill="currentColor"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"
          />
          <path
            fill="currentColor"
            d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
          />
        </svg>
      ),
    },
    {
      id: 'lowSaturation',
      name: 'Low Saturation',
      icon: (
        <MdGradient size={40} />
      ),
    },
    {
      id: 'monochrome',
      name: 'Monochrome',
      icon: (
        <MdMonochromePhotos size={40} />
      ),
    },
  ];

  const ContentAdjustments = [
    { id: 'highlightTitle', name: 'Highlight Title' },
    { id: 'highlightLinks', name: 'Highlight Links' },
    { id: 'dyslexiaFont', name: 'Dyslexia Font' },
    { id: 'letterSpacing', name: 'Letter Spacing' },
    { id: 'lineHeight', name: 'Line Height' },
    { id: 'fontWeight', name: 'Font Weight' },
  ];

  const filteredProfiles = accessibilityProfiles.filter(
    (profile) => toggles[profile.id as keyof Toggles] !== false,
  );

  const filteredTools = ToolButtons.filter(
    (tool) => toggles[tool.id as keyof Toggles] !== false,
  );

  const filteredColorAdjustment = colorAdjustments.filter(
    (button) => toggles[button.id as keyof Toggles] !== false,
  );

  const filteredContentAdjustment = ContentAdjustments.filter(
    (button) => toggles[button.id as keyof Toggles] !== false,
  );

  return (
    <div
      style={{
        ...fontStyle,
        backgroundColor: colors['menuBg'],
        // color: colors['widgetInnerText'],
      }}
      className="w-full bg-[#eff1f5] text-base sm:text-lg flex flex-col h-[calc(100vh-2rem)] md:h-screen overflow-hidden"
    >
      <header
        style={{
          ...fontStyle,
          backgroundColor: colors['headerBg'],
          color: colors['headerText'],
        }}
        className="flex items-center justify-between py-2 px-4 h-14 bg-[#0848ca] text-white"
      >
        <h1 style={fontStyle} className="text-lg font-semibold">
          Accessibility Menu
        </h1>
        <div style={fontStyle} className="flex gap-4">
          <button
            style={fontStyle}
            className="p-2 bg-white rounded-full"
            aria-label="Widget settings"
          >
            <FaGear className="w-6 h-6 text-[#0848ca]" />
          </button>
          <button
            style={fontStyle}
            className="p-2 bg-white rounded-full"
            aria-label="Reset accessibility settings"
          >
            <FaRotateRight className="w-6 h-6 text-[#0848ca]" />
          </button>
          <button
            style={fontStyle}
            className="p-2 bg-white rounded-full"
            aria-label="Close accessibility menu"
          >
            <FaX className="w-6 h-6 text-[#0848ca]" />
          </button>
        </div>
      </header>

      <div style={fontStyle} className="flex-grow overflow-y-auto">
        <div style={fontStyle} className="p-4 space-y-4">
          <button
            style={{
              ...fontStyle,
              backgroundColor: colors['dropdownBg'],
              color: colors['dropdownText'],
            }}
            className="w-full flex items-center justify-between p-4 bg-white rounded-xl"
          >
            <div style={fontStyle} className="flex items-center gap-3">
              <span
                style={fontStyle}
                className="w-8 h-8 bg-[#0848ca] text-white rounded-full flex items-center justify-center"
              >
                US
              </span>
              <span style={fontStyle}>English (USA)</span>
            </div>
            <FaChevronDown className="w-5 h-5" style={fontStyle} />
          </button>

          <div style={fontStyle} className="relative">
            <button
              style={{
                ...fontStyle,
                backgroundColor: colors['dropdownBg'],
                color: colors['dropdownText'],
              }}
              onClick={() => setShowProfiles(!showProfiles)}
              className="w-full flex items-center justify-between p-4 bg-white rounded-xl"
            >
              <div style={fontStyle} className="flex items-center gap-3">
                <span
                  style={fontStyle}
                  className="w-8 h-8 text-[#0848ca] rounded-full flex items-center justify-center"
                >
                  <FaUniversalAccess className="w-14 h-14" style={fontStyle} />
                </span>
                <span style={fontStyle}>Accessibility Profiles</span>
              </div>
              <FaChevronDown className="w-5 h-5" style={fontStyle} />
            </button>

            {showProfiles && (
              <div style={fontStyle} className="mt-4">
                <div style={fontStyle} className="grid grid-cols-3 gap-4">
                  {filteredProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      style={{
                        ...fontStyle,
                        backgroundColor: colors['buttonBg'],
                        color: colors['buttonText'],
                      }}
                      className="bg-white p-4 rounded-xl flex flex-col items-center justify-center hover:outline hover:outline-2 hover:outline-[#0848ca] transition-all"
                    >
                      {profile.icon}
                      <span
                        style={{
                          ...fontStyle,
                          backgroundColor: colors['buttonBg'],
                          color: colors['buttonText'],
                        }}
                        className="mt-2 text-center text-sm"
                      >
                        {profile.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={fontStyle}>
            <h2
              style={{
                ...fontStyle,
                color: colors['widgetInnerText'],
              }}
              className="text-xl font-semibold mb-2"
            >
              Content Adjustments
            </h2>
            <div
              style={{
                ...fontStyle,
                backgroundColor: colors['fontSizeMenuBg'],
              }}
              className="bg-white p-4 rounded-xl mb-4"
            >
              <div
                style={fontStyle}
                className="flex items-center justify-between mb-4"
              >
                <div style={fontStyle} className="flex items-center gap-2">
                  <FaFont
                    className="w-6 h-6"
                    style={{
                      ...fontStyle,
                      color: colors['fontSizeMenuText'],
                    }}
                  />
                  <span
                    style={{
                      ...fontStyle,
                      color: colors['fontSizeMenuText'],
                    }}
                  >
                    Adjust Font Size
                  </span>
                </div>
              </div>
              <div
                style={fontStyle}
                className="flex items-center justify-between"
              >
                <button
                  style={{
                    ...fontStyle,
                    backgroundColor: colors['fontSizeMenuButton'],
                    color: colors['fontSizeMenuText'],
                  }}
                  onClick={() => setFontSize((prev) => Math.max(prev - 10, 80))}
                  className="w-10 h-10 bg-[#eff1f5] rounded-full flex items-center justify-center text-2xl"
                >
                  -
                </button>
                <span
                  style={{
                    ...fontStyle,
                    color: colors['fontSizeMenuText'],
                  }}
                >
                  {fontSize}%
                </span>
                <button
                  style={{
                    ...fontStyle,
                    backgroundColor: colors['fontSizeMenuButton'],
                    color: colors['fontSizeMenuText'],
                  }}
                  onClick={() =>
                    setFontSize((prev) => Math.min(prev + 10, 150))
                  }
                  className="w-10 h-10 bg-[#eff1f5] rounded-full flex items-center justify-center text-2xl"
                >
                  +
                </button>
              </div>
            </div>
            <div style={fontStyle} className="grid grid-cols-3 gap-4">
              {filteredContentAdjustment.map((item, index) => (
                <button
                  key={index}
                  style={{
                    ...fontStyle,
                    backgroundColor: colors['buttonBg'],
                    color: colors['buttonText'],
                  }}
                  className="bg-white p-4 rounded-xl flex flex-col items-center justify-center hover:outline hover:outline-2 hover:outline-solid hover:outline-[#0848ca]"
                >
                  <span style={fontStyle} className="text-3xl mb-2">
                    {item.name === 'Highlight Links' ? (
                      <FaLink className="w-8 h-8" style={fontStyle} />
                    ) : (
                      item.name[0]
                    )}
                  </span>
                  <span style={fontStyle}>{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={fontStyle} className="mt-8">
            <h2
              style={{
                ...fontStyle,
                color: colors['widgetInnerText'],
              }}
              className="text-xl font-semibold mb-4"
            >
              Color Adjustments
            </h2>
            <div style={fontStyle} className="grid grid-cols-3 gap-4">
              {filteredColorAdjustment.map((item, index) => (
                <button
                  key={index}
                  style={{
                    ...fontStyle,
                    backgroundColor: colors['buttonBg'],
                    color: colors['buttonText'],
                  }}
                  className="bg-white p-4 rounded-xl flex flex-col items-center justify-center hover:outline hover:outline-2 hover:outline-[#0848ca]"
                >
                  {item.icon}
                  <span
                    style={{
                      ...fontStyle,
                      backgroundColor: colors['buttonBg'],
                      color: colors['buttonText'],
                    }}
                    className="mt-2 text-center"
                  >
                    {item.name}
                  </span>
                </button>
              ))}
            </div>

            <div style={fontStyle} className="grid grid-cols-3 gap-4 mt-4">
              {['Text', 'Title', 'BG'].map((type, index) => (
                <div
                  key={index}
                  style={fontStyle}
                  className="bg-white p-4 rounded-xl flex justify-center flex-col"
                >
                  <h3 style={fontStyle} className="text-center mb-4">
                    Adjust {type} Colors
                  </h3>
                  <div
                    style={fontStyle}
                    className="grid grid-cols-2 gap-2 mb-4 m-auto"
                  >
                    {[
                      '#4C6EF5', // blue
                      '#7048E8', // purple
                      '#F03E3E', // red
                      '#F76707', // orange
                      '#12B886', // teal
                      '#82C91E', // green
                      '#FFFFFF', // white
                      '#000000', // black
                    ].map((color, i) => (
                      <button
                        key={i}
                        style={{
                          ...fontStyle,
                          backgroundColor: color,
                          border:
                            color === '#FFFFFF' ? '1px solid #E2E8F0' : 'none',
                        }}
                        className="w-8 h-8 rounded-full"
                      />
                    ))}
                  </div>
                  <button
                    style={fontStyle}
                    className="w-full text-center text-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={fontStyle} className="mt-8">
            <h2
              style={{
                ...fontStyle,
                color: colors['widgetInnerText'],
              }}
              className="text-xl font-semibold mb-4"
            >
              Tools
            </h2>
            <div style={fontStyle} className="grid grid-cols-3 gap-4">
              {filteredTools.map((tool, index) => (
                <button
                  key={index}
                  style={{
                    ...fontStyle,
                    backgroundColor: colors['buttonBg'],
                    color: colors['buttonText'],
                  }}
                  className="bg-white p-4 rounded-xl flex flex-col items-center justify-center hover:outline hover:outline-2 hover:outline-[#0848ca]"
                >
                  {tool.icon}
                  <span
                    style={{
                      ...fontStyle,
                      backgroundColor: colors['buttonBg'],
                      color: colors['buttonText'],
                    }}
                    className="mt-2 text-center text-lg"
                  >
                    {tool.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <footer
        style={{
          ...fontStyle,
          backgroundColor: colors['footerBg'],
          color: colors['footerText'],
        }}
        className="bg-white p-4 border-t flex justify-between items-center"
      >
        <div style={fontStyle}>
          <a
            style={{
              ...fontStyle,
              color: colors['footerText'],
            }}
            href="https://www.webability.io/statement"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[#3563E9] hover:underline"
          >
            Accessibility Statement
          </a>
          <button
            style={{
              ...fontStyle,
              color: colors['footerText'],
            }}
            className="text-[#3563E9] hover:underline"
          >
            Report a Problem
          </button>
        </div>
        <LogoIcon
          style={{
            ...fontStyle,
            color: colors['footerText'],
          }}
        />
      </footer>
    </div>
  );
};

export default AccessibilityMenu;
