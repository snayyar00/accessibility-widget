import { Switch } from '@mui/material';
import type React from 'react';
import { Colors, Toggles } from './editWidget';
import { ReactComponent as LogoIcon } from '@/assets/images/svg/logo.svg';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';


interface CustomizeWidgetProps {
  colors: Colors;
  setColors: React.Dispatch<React.SetStateAction<Colors>>;
  toggles: Toggles;
  setToggles: React.Dispatch<React.SetStateAction<Toggles>>;
  font: string[];
  selectedFont: string;
  setSelectedFont: React.Dispatch<React.SetStateAction<string>>;
  DefaultColors: Colors;
}

const CustomizeWidget: React.FC<CustomizeWidgetProps> = ({
  colors,
  setColors,
  toggles,
  setToggles,
  font,
  setSelectedFont,
  selectedFont,
  DefaultColors,
}) => {
  const updateColor = (key: keyof Colors) => (color: string) => {
    setColors((prev) => ({ ...prev, [key]: color }));
  };

  const resetColor = (key: keyof Colors) => () => {
    setColors((prev) => ({ ...prev, [key]: DefaultColors[key] }));
  };

  const toggleFeatures = [
    { key: 'language', label: 'Toggle Language' },
    { key: 'darkMode', label: 'Toggle Dark Mode' },
    { key: 'screenReader', label: 'Toggle Screen Reader' },
    { key: 'readingGuide', label: 'Toggle Reading Guide' },
    { key: 'stopAnimations', label: 'Toggle Stop Animations' },
    { key: 'bigCursor', label: 'Toggle Big Cursor' },
    { key: 'voiceNavigation', label: 'Toggle Voice Navigation' },
    { key: 'darkContrast', label: 'Toggle Dark Contrast' },
    { key: 'lightContrast', label: 'Toggle Light Contrast' },
    { key: 'highContrast', label: 'Toggle High Contrast' },
    { key: 'highSaturation', label: 'Toggle High Saturation' },
    { key: 'lowSaturation', label: 'Toggle Low Saturation' },
    { key: 'monochrome', label: 'Toggle Monochrome' },
    { key: 'highlightLinks', label: 'Toggle Highlight Links' },
    { key: 'highlightTitle', label: 'Toggle Highlight title' },
    { key: 'dyslexiaFont', label: 'Toggle Dyslexia Font' },
    { key: 'letterSpacing', label: 'Toggle Letter Spacing' },
    { key: 'lineHeight', label: 'Toggle Line Height' },
    { key: 'fontWeight', label: 'Toggle Font Weight' },
    { key: 'motorImpaired', label: 'Toggle Motor Impaired' },
    { key: 'blind', label: 'Toggle Blind' },
    { key: 'dyslexia', label: 'Toggle Dyslexia' },
    { key: 'visuallyImpaired', label: 'Toggle Visually Impaired' },
    { key: 'cognitiveAndLearning', label: 'Toggle Cognitive & Learning' },
    { key: 'seizureAndEpileptic', label: 'Toggle Seizure & Epileptic' },
    { key: 'colorBlind', label: 'Toggle Color Blind' },
    { key: 'adhd', label: 'Toggle ADHD' },
  ];

  const colorPickers = [
    { key: 'headerText', label: 'Header Text Color' },
    { key: 'headerBg', label: 'Header BG Color' },
    { key: 'headerControlsColor', label: 'Header Controls Color' },
    { key: 'footerText', label: 'Footer Text Color' },
    { key: 'footerBg', label: 'Footer BG Color' },
    { key: 'buttonText', label: 'Button Text Color' },
    { key: 'buttonBg', label: 'Button BG Color' },
    { key: 'widgetBtnColor', label: 'Widget Button Color' },
    { key: 'menuBg', label: 'Menu Background Color' },
    { key: 'dropdownText', label: 'Dropdown Text Color' },
    { key: 'dropdownBg', label: 'Dropdown BG Color' },
    { key: 'widgetInnerText', label: 'Widget Inner Text Color' },
    { key: 'fontSizeMenuBg', label: 'Font Size Menu BG Color' },
    { key: 'fontSizeMenuText', label: 'Font Size Menu Text Color' },
    { key: 'fontSizeMenuButton', label: 'Font Size Menu Button Color' },
    { key: 'reportButtonsBgColor', label: 'Report Buttons BG Color' },
    { key: 'reportButtonsTextColor', label: 'Report Buttons Text Color' },
  ];

  const fileInputRef = useRef(null); // Create a ref for the file input
  const urlInputRef = useRef(null);  // Create a ref for the URL input

  const handleReset = () => {
    setColors((prevColors) => ({
      ...prevColors,  // Keep all the previous state values
      logoImage: "",  // Reset the logoImage to an empty string
    }));
    
    // Clear the file input using the ref
    if (fileInputRef.current) {
      (fileInputRef.current as any).value = "";  // Clear the file input field
    }

    // Clear the URL input field using the ref
    if (urlInputRef.current) {
      (urlInputRef.current as any).value = "";  // Clear the URL input field
    }
    setIsFileInput(true);
    setIsUrlInput(true);
  };
  const [isFileInput, setIsFileInput] = useState(true);
  const [isUrlInput, setIsUrlInput] = useState(true);
  const [logoInput, setLogoInput] = useState("");
  const[accessibilityStatementLinkUrl, setAccessibilityStatementLinkUrl] = useState(colors.accessibilityStatementLinkUrl);
  const[logoUrl, setLogoUrl] = useState(colors.logoUrl);

  useEffect(()=>{
    setAccessibilityStatementLinkUrl(colors.accessibilityStatementLinkUrl);
    setLogoUrl(colors.logoUrl)
  },[colors.accessibilityStatementLinkUrl,colors.logoUrl])
  const isBase64 = (str:any) => {
    const regex = /^data:image\/(png|jpg|jpeg|gif|bmp);base64,/;
    return regex.test(str);
  };

  // Function to validate URL
  const isValidUrl = (str:any) => {
    const regex = /^(http:\/\/|https:\/\/)([a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+)(\/[a-zA-Z0-9\-._~:?#\[\]@!$&'()*+,;=]*)?$/;
    return regex.test(str);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
  
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        toast.error("Only PNG or SVG images are allowed.");
        e.target.value = ""; // Reset the input field to remove the file name
        return; // Prevent the file from being processed if the type is invalid
      }
  
      // Validate file size (should not exceed 10 KB)
      if (file.size > 76800) {
        toast.error("File size should not exceed 75 KB.");
        e.target.value = ""; // Reset the input field to remove the file name
        return; // Prevent the file from being processed if the size is too large
      }
  
      // If valid, read the file as base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        setLogoInput(base64String); // Store the base64 data
        setColors((prev) => ({
          ...prev,
          logoImage: base64String, // Update the logoImage state
        }));
      };
      reader.readAsDataURL(file); // Only proceed if the file passed validation
  
      // Disable the URL input once file input is used
      setIsUrlInput(false);
      setIsFileInput(true);
    }
  };
  
  

  return (
    <div className="w-full max-w-[500px] mx-auto bg-[#eff1f5] font-serif text-base sm:text-lg flex flex-col h-[calc(100vh-2rem)] md:h-screen overflow-hidden">
      <header className="flex items-center justify-between py-7 px-3 sm:px-4 h-12 sm:h-14 bg-[#0848ca] text-white sticky top-0 z-20">
        <h1 className="text-base sm:text-lg font-semibold">Customize Widget</h1>
      </header>

      <div className="flex-grow overflow-y-auto">
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="bg-white p-3 sm:p-4 rounded-xl">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              Widget Color Adjustments
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 mt-4">
              {colorPickers.map(({ key, label }) => (
                <div key={key} className="flex flex-col items-center">
                  <label
                    className="text-center text-sm sm:text-lg mb-1"
                    htmlFor={key}
                  >
                    {label}
                  </label>
                  <div className="relative w-12 h-12">
                    <input
                      type="color"
                      id={key}
                      value={String(colors[key as keyof typeof colors])}
                      onChange={(e) =>
                        updateColor(key as keyof Colors)(e.target.value)
                      }
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div
                      className="w-12 h-12 rounded-full border border-gray-300"
                      style={{
                        backgroundColor: colors[key as keyof Colors],
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetColor(key as keyof Colors)();
                    }}
                    className="mt-2 px-2 py-1 text-sm border border-gray-300 rounded"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
            Upload Widget Logo
          </h2>

          {/* File upload */}
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            disabled={!isFileInput}
            className="w-full p-2 border rounded mb-3 sm:mb-4 text-sm sm:text-base"
            onChange={handleFileChange}
          />

          {/* URL input */}
          <div className="flex items-center mb-3 sm:mb-4">
            <input
              type="text"
              placeholder="Or enter image URL"
              className="w-full p-2 border rounded text-sm sm:text-base"
              ref={urlInputRef}
              disabled={!isUrlInput}
              onChange={(e) => {
                const url = e.target.value.trim();
                if (url) {
                  // Validate if it's a proper URL (you can use a more complex regex for URL validation if needed)
                  setLogoInput(url);
                }
                setIsFileInput(false); // Mark URL input as used, disable file input
              }}
            />
          </div>

          {/* Displaying the logo */}
          <div>
            {colors.logoImage.length ? (
              <img
                src={colors.logoImage.length ? colors.logoImage : (LogoIcon as any)}
                alt="Logo Preview"
                className="w-24 h-24 sm:w-32 sm:h-32 object-contain"
              />
            ):<LogoIcon/>}
          </div>
            <button
              onClick={handleReset}
              className="px-3 py-2 mt-4 sm:px-4 sm:py-2 bg-[#0948c9] text-white rounded text-sm sm:text-base"
            >
              Reset
            </button>
            <button
              onClick={()=>{
                if (isBase64(logoInput)) {
                  // If Base64, just update the state
                  setColors((prev) => ({
                    ...prev,
                    logoImage: logoInput,
                  }));
                  setIsFileInput(true);
                  setIsUrlInput(false);  // Disable URL input after selecting Base64
                } else if (isValidUrl(logoInput)) {
                  // If URL, check if valid and update the state
                  setColors((prev) => ({
                    ...prev,
                    logoImage: logoInput,
                  }));
                  setIsUrlInput(true);
                  setIsFileInput(false);  // Disable file input after selecting URL
                } else {
                  // Alert the user if the input is neither a valid Base64 nor URL
                  toast.error('Please provide a valid Image or URL.');
                }
              }}
              className="ml-5 px-3 py-2 sm:px-4 sm:py-2 bg-[#0948c9] text-white rounded text-sm sm:text-base"
            >
              Set Logo
            </button>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
            Set Logo Link Url
          </h2>
          {/* URL input */}
          <div className="flex items-center mb-3 sm:mb-4">
            <input
              type="text"
              placeholder="Enter Logo Link URL"
              className="w-full p-2 border rounded text-sm sm:text-base"
              value={logoUrl}
              onChange={(e) => {
                const url = e.target.value.trim();
                if (url) {
                  // Validate if it's a proper URL (you can use a more complex regex for URL validation if needed)
                  setColors((prev) => ({
                    ...prev,
                    logoUrl: url,
                  }));
                }
                setLogoUrl(url);
              }}
            />
          </div>

         
            <button
              onClick={()=>{
                setColors((prev) => ({
                  ...prev,
                  logoUrl: DefaultColors.logoUrl,
                }));
                setLogoUrl(DefaultColors.logoUrl);
              }}
              className="px-3 py-2 mt-4 sm:px-4 sm:py-2 bg-[#0948c9] text-white rounded text-sm sm:text-base"
            >
              Reset
            </button>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
            Set Accesibility Statement Link Url
          </h2>
          {/* URL input */}
          <div className="flex items-center mb-3 sm:mb-4">
            <input
              type="text"
              placeholder="Enter Accessibility Statement Link URL"
              className="w-full p-2 border rounded text-sm sm:text-base"
              value={accessibilityStatementLinkUrl}
              onChange={(e) => {
                const url = e.target.value.trim();
                if (url) {
                  // Validate if it's a proper URL (you can use a more complex regex for URL validation if needed)
                  setColors((prev) => ({
                    ...prev,
                    accessibilityStatementLinkUrl: url,
                  }));
                }
                setAccessibilityStatementLinkUrl(url);
              }}
            />
          </div>

            <button
              onClick={()=>{
                setColors((prev) => ({
                  ...prev,
                  accessibilityStatementLinkUrl: DefaultColors.accessibilityStatementLinkUrl,
                }));
                setAccessibilityStatementLinkUrl(DefaultColors.accessibilityStatementLinkUrl);
              }}
              className="px-3 py-2 mt-4 sm:px-4 sm:py-2 bg-[#0948c9] text-white rounded text-sm sm:text-base"
            >
              Reset
            </button>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              Select Widget Font
            </h2>
            <select
              className="w-full p-2 border rounded mb-3 sm:mb-4 text-sm sm:text-base"
              value={selectedFont}
              onChange={(e) => setSelectedFont(e.target.value)}
            >
              <option value="'Times New Roman', serif">
                'Times New Roman', serif
              </option>
              {font.map((fonts) => (
                <option key={fonts} value={fonts}>
                  {fonts}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSelectedFont("'Times New Roman', serif");
              }}
              className="px-3 py-2 sm:px-4 sm:py-2 bg-[#0948c9] text-white rounded text-sm sm:text-base"
            >
              Reset
            </button>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              Toggle Features
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {toggleFeatures.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm sm:text-lg flex-1">{label}</span>
                  <Switch
                    checked={Boolean(toggles[key as keyof typeof toggles])}
                    onChange={(e) => {
                      setToggles((prev: any) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }));
                    }}
                    color="primary"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomizeWidget;
