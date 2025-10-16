// Helper function to set CSS custom properties for button states
function setButtonBorderColors(customColor: string, $menu: HTMLElement) {
  // Set CSS custom properties on the menu element
  $menu.style.setProperty('--asw-button-border-color', customColor);
  $menu.style.setProperty('--asw-profile-border-color', customColor);
  $menu.style.setProperty('--asw-selected-border-color', customColor);
}

// Helper function to inject selected language styling
function injectSelectedLanguageStyles(
  selectedLanguageColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-selected-language-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Selected language styling - dedicated selector with highest specificity */
    .asw-container .asw-menu .asw-language-list .asw-language-option.asw-language-selected {
      background-color: ${selectedLanguageColor} !important;
      color: white !important;
    }

    .asw-container .asw-menu .asw-language-list .asw-language-option.asw-language-selected .asw-language-name {
      color: white !important;
    }

    .asw-container .asw-menu .asw-header-lang-selector .asw-language-list .asw-language-option.asw-language-selected {
      background-color: ${selectedLanguageColor} !important;
      color: white !important;
    }

    .asw-container .asw-menu .asw-header-lang-selector .asw-language-list .asw-language-option.asw-language-selected .asw-language-name {
      color: white !important;
    }

    /* Move Widget dropdown selected state styling */
    .asw-container .asw-menu .asw-custom-dropdown-item[aria-selected="true"] {
      background-color: ${selectedLanguageColor} !important;
      color: white !important;
    }

    .asw-container .asw-menu .asw-custom-dropdown-item[aria-selected="true"] span {
      color: white !important;
    }

  `;

  // Append the style element to the document head
  targetDocument.head.appendChild(styleElement);
}

// Helper function to inject dynamic CSS for other button states
function injectSelectedButtonStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-custom-selected-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Hover state for cards */
    .asw-container .asw-menu .asw-card:hover {
      border-color: ${customColor} !important;
    }
    
    /* Structure items hover */
    .asw-container .asw-menu .asw-structure-item:hover {
      border-color: ${customColor} !important;
    }

    /* Selected button background */
    .asw-container .asw-menu .asw-btn.asw-selected {
      background-color: ${customColor} !important;
    }

    /* Selected button text - white */
    .asw-container .asw-menu .asw-btn.asw-selected .asw-label,
    .asw-container .asw-menu .asw-btn.asw-selected span:not(.asw-icon) {
      color: #ffffff !important;
    }

    /* Selected button SVG icons - white */
    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg,
    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg path,
    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg circle,
    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg rect,
    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg line,
    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg polyline,
    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg polygon,
    .asw-container .asw-menu .asw-btn.asw-selected svg,
    .asw-container .asw-menu .asw-btn.asw-selected svg path,
    .asw-container .asw-menu .asw-btn.asw-selected svg circle,
    .asw-container .asw-menu .asw-btn.asw-selected svg rect {
      fill: #ffffff !important;
    }

    /* Font size slider thumb - custom color border */
    .asw-container .asw-menu .asw-font-slider::-webkit-slider-thumb {
      border-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-font-slider::-moz-range-thumb {
      border-color: ${customColor} !important;
    }

    /* Font size slider progress line - custom color */
    .asw-container .asw-menu .asw-slider-progress-line {
      background: ${customColor} !important;
    }

    /* Font size slider focus state */
    .asw-container .asw-menu .asw-font-slider:focus::-webkit-slider-thumb {
      box-shadow: 0 0 0 3px ${customColor}33 !important;
    }

    .asw-container .asw-menu .asw-font-slider:focus::-moz-range-thumb {
      box-shadow: 0 0 0 3px ${customColor}33 !important;
    }

    /* Plus and minus buttons - ensure transparent backgrounds */
    .asw-container .asw-menu .asw-plus,
    .asw-container .asw-menu .asw-minus {
      background-color: transparent !important;
      background: transparent !important;
    }

    .asw-container .asw-menu .asw-plus:hover,
    .asw-container .asw-menu .asw-minus:hover {
      background-color: transparent !important;
      background: transparent !important;
      border-color: ${customColor} !important;
    }

    /* Font size button hover state */
    .asw-container .asw-menu .asw-font-size-btn:hover {
      background-color: #f8fafc !important;
      color: ${customColor} !important;
    }

    /* Font size button focus state */
    .asw-container .asw-menu .asw-font-size-btn:focus {
      outline-color: ${customColor} !important;
    }

    /* Selected font size button */
    .asw-container .asw-menu .asw-font-size-btn.asw-selected {
      background-color: ${customColor} !important;
      color: #ffffff !important;
    }

    /* Selected font size button hover - darker shade */
    .asw-container .asw-menu .asw-font-size-btn.asw-selected:hover {
      background-color: ${customColor} !important;
      opacity: 0.85 !important;
      color: #ffffff !important;
    }

    /* Profile buttons when selected */
    .asw-container .asw-menu .profile-grid .asw-btn.asw-selected svg {
      fill: #ffffff !important;
    
    }

    .asw-container .asw-menu .profile-grid .asw-btn.asw-selected span {
      color: #ffffff !important;
    }
    
    /* Filter buttons when selected */
    .asw-container .asw-menu .asw-filter.asw-selected svg,
    .asw-container .asw-menu .asw-filter.asw-selected svg path {
      fill: #ffffff !important;
    }
    
    .asw-container .asw-menu .asw-filter.asw-selected .asw-label,
    .asw-container .asw-menu .asw-filter.asw-selected span {
      color: #ffffff !important;
    }
    
    /* Hover state for profile buttons */
    .asw-container .asw-menu .profile-grid .asw-btn:hover svg path {
      fill: ${customColor} !important;
    }

    /* Toggle switches - checked state */
    .asw-container .asw-menu input:checked + .slider {
      background-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-oversize-toggle-switch input:checked + .asw-oversize-toggle-slider {
      background-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-header-toggle-switch input:checked + .slider {
      background-color: ${customColor} !important;
      border-color: ${customColor} !important;
    }

    /* Toggle switch focus state */
    .asw-container .asw-menu .asw-oversize-toggle-switch input:focus + .asw-oversize-toggle-slider {
      box-shadow: 0 0 1px ${customColor} !important;
    }

    /* Toggle switch border (unchecked state for header toggle) */
    .asw-container .asw-menu .asw-header-toggle-switch .slider {
      border-color: ${customColor} !important;
    }

    /* Sun and moon icons in header toggle */
    .asw-container .asw-menu .asw-header-toggle-switch .sun svg,
    .asw-container .asw-menu .asw-header-toggle-switch .sun svg path {
      fill: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-header-toggle-switch .moon svg,
    .asw-container .asw-menu .asw-header-toggle-switch .moon svg path {
      fill: ${customColor} !important;
    }

    /* Report issue page - header background */
    .asw-container .report-problem-menu .asw-menu-header {
      background-color: ${customColor} !important;
    }

    /* Report issue page - submit button */
    .asw-container .submit-button {
      background: ${customColor} !important;
      border-color: ${customColor} !important;
    }

    .asw-container .submit-button:hover {
      background: ${customColor} !important;
      opacity: 0.85 !important;
    }

    /* Report issue page - cancel button */
    .asw-container .cancel-button {
      background: ${customColor} !important;
      border-color: ${customColor} !important;
    }

    .asw-container .cancel-button:hover {
      background: ${customColor} !important;
      opacity: 0.85 !important;
    }

    /* Report issue page - input focus states */
    .asw-container #problem-description:focus,
    .asw-container #problem-email:focus {
      border-color: ${customColor} !important;
      box-shadow: 0 0 0 3px ${customColor}1A !important;
    }

    .asw-container #issue-type-dropdown:focus {
      border-color: ${customColor} !important;
      box-shadow: 0 0 0 3px ${customColor}1A !important;
    }

    /* Issue type buttons */
    .asw-container .issue-type-button {
      background: ${customColor} !important;
      border-color: ${customColor} !important;
    }

    .asw-container .issue-type-button:hover {
      background: ${customColor} !important;
      opacity: 0.85 !important;
    }

    .asw-container .issue-type-button.selected {
      background: ${customColor} !important;
      border-color: white !important;
    }

    /* Report issue form labels */
    .asw-container #report-problem-form label {
      color: ${customColor} !important;
    }

    /* Issue type selection heading */
    .asw-container #issue-type-selection h2 {
      color: ${customColor} !important;
    }

    /* Issue type dropdown border and text */
    .asw-container #issue-type-dropdown {
      border-color: ${customColor} !important;
      color: ${customColor} !important;
    }

    /* Dropdown options text color - handled by dedicated dropdown function */

    /* Select dropdown focus state border color */
    .asw-container #select-font-dropdown:focus {
      border-color: ${customColor} !important;
      box-shadow: 0 0 0 3px ${customColor}1A !important;
    }

    .asw-container #select-font-dropdown {
      border-color: ${customColor} !important;
    }

    /* Custom dropdown toggle - border and text color with higher specificity */
    .asw-container .asw-menu .asw-card .asw-custom-dropdown-toggle {
      border-color: ${customColor} !important;
      color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-card .asw-custom-dropdown-toggle:hover {
      border-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-card .asw-custom-dropdown-toggle:focus {
      border-color: ${customColor} !important;
      box-shadow: 0 0 0 2px ${customColor}1A !important;
    }

    .asw-container .asw-menu .asw-card .asw-custom-dropdown-text {
      color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-card .asw-custom-dropdown-icon {
      color: ${customColor} !important;
    }

    /* Custom dropdown items - unselected state with maximum specificity */
    .asw-container .asw-menu .asw-card .asw-custom-dropdown-item:not([aria-selected="true"]) {
      color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-card .asw-custom-dropdown-item:not([aria-selected="true"]) span {
      color: ${customColor} !important;
    }

    /* Language dropdown text styling - only for unselected languages */
    .asw-container .asw-menu .asw-header-lang-selector .asw-language-option:not(.selected) .asw-language-name {
      color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-header-lang-selector .asw-language-option:not(.selected) {
      color: ${customColor} !important;
    }


    /* Set CSS custom property for dropdown selected items */
    :root {
      --asw-custom-color: ${customColor};
      --asw-dropdown-text-color: ${customColor};
      --asw-dropdown-hover-bg: rgba(${hexToRgb(customColor)}, 0.1);
    }

    .asw-container .asw-custom-dropdown-check {
      color: white !important;
    }

    /* Hide Widget Modal Colors */
    .asw-container .asw-confirmation-modal .asw-modal-btn-primary {
      background: linear-gradient(135deg, ${customColor} 0%, ${customColor} 100%) !important;
      border-color: ${customColor} !important;
    }

    .asw-container .asw-confirmation-modal .asw-modal-btn-primary:hover {
      background: linear-gradient(135deg, ${customColor} 0%, ${customColor} 100%) !important;
      box-shadow: 0 8px 25px ${customColor}4D !important;
    }

    .asw-container .asw-confirmation-modal .asw-modal-icon {
      /* Icon styling removed - no background circle */
    }

    .asw-container .asw-confirmation-modal .asw-modal-icon svg path {
      stroke: ${customColor} !important;
    }

    .asw-container .asw-confirmation-modal .asw-modal-icon svg path[fill] {
      fill: ${customColor} !important;
    }

    .asw-container .asw-confirmation-modal .asw-modal-title {
      color: ${customColor} !important;
    }
  `;

  targetDocument.head.appendChild(styleElement);
}

// Helper function to inject CSS for slider pseudo-element borders
function injectSliderBorderStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-slider-border-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules for slider pseudo-elements
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Font size slider thumb borders - custom color */
    .asw-container .asw-menu .asw-font-slider::-webkit-slider-thumb {
      border-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-font-slider::-moz-range-thumb {
      border-color: ${customColor} !important;
    }

    /* Font size slider focus state borders */
    .asw-container .asw-menu .asw-font-slider:focus::-webkit-slider-thumb {
      box-shadow: 0 0 0 3px ${customColor}33 !important;
    }

    .asw-container .asw-menu .asw-font-slider:focus::-moz-range-thumb {
      box-shadow: 0 0 0 3px ${customColor}33 !important;
    }
  `;

  targetDocument.head.appendChild(styleElement);
}

// Helper function to inject CSS for numbered button styles
function injectNumberedButtonStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-numbered-button-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules for numbered buttons
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Numbered buttons (1,2,3,4,5) - unselected state uses custom blue color */
    .asw-container .asw-menu .asw-font-size-btn:not(.asw-selected) {
      background-color: transparent !important;
      color: ${customColor} !important;
      border: none !important;
    }

    .asw-container .asw-menu .asw-font-size-btn:not(.asw-selected):hover {
      background-color: transparent !important;
      color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-font-size-btn:not(.asw-selected):focus {
      background-color: transparent !important;
      color: ${customColor} !important;
      outline: none !important;
    }
  `;

  targetDocument.head.appendChild(styleElement);
}

// Helper function to inject CSS for header icon styles
function injectHeaderIconStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-header-icon-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Override hardcoded white styles for header icons */
    .asw-container .asw-menu .asw-header-icon,
    .asw-container .asw-menu .asw-header-icon *,
    .asw-container .asw-menu .asw-header-icon path,
    .asw-container .asw-menu .asw-header-icon svg {
      stroke: ${customColor} !important;
      fill: ${customColor} !important;
      color: ${customColor} !important;
    }
          /* Ensure reset button icon is always visible with proper styling */
    .asw-container .asw-menu .asw-menu-reset .asw-header-icon,
    .asw-container .asw-menu .asw-menu-reset .asw-header-icon *,
    .asw-container .asw-menu .asw-menu-reset .asw-header-icon path,
    .asw-container .asw-menu .asw-menu-reset .asw-header-icon svg {
      fill: ${customColor} !important;
      color: ${customColor} !important;
      stroke: none !important;
      opacity: 1 !important;
      visibility: visible !important;
      display: block !important;
      width: 16px !important;
      height: 16px !important;
    }

    /* Override other header SVG styles */
    .asw-container .asw-menu .asw-menu-header svg:not(.asw-header-icon) {
      fill: ${customColor} !important;
    }
  `;

  targetDocument.head.appendChild(styleElement);
}

// Helper function to inject CSS for header text styles
function injectHeaderTextStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-header-text-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Override hardcoded white styles for header text */
    .asw-container .asw-menu .asw-menu-title {
      color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-report-issue-btn {
      color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-header-lang-selector .asw-selected-lang {
      color: ${customColor} !important;
    }
  `;

  targetDocument.head.appendChild(styleElement);
}

// Helper function to inject CSS for dropdown background styles
function injectDropdownBackgroundStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-dropdown-background-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules with maximum specificity
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Dropdown background styles with maximum specificity */
    .asw-container .asw-menu .asw-custom-dropdown-menu {
      background-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-header-lang-selector .asw-lang-dropdown-content {
      background-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-header-lang-selector .lang-card {
      background-color: ${customColor} !important;
    }
  `;

  document.head.appendChild(styleElement);
}

// Helper function to inject CSS for all hover states
function injectAllHoverStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-all-hover-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules with maximum specificity
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* All hover states with maximum specificity */
    .asw-container .asw-menu .asw-btn:hover {
      border-color: ${customColor} !important;
      background-color: rgba(${hexToRgb(customColor)}, 0.1) !important;
    }

    .asw-container .asw-menu .asw-card:hover {
      border-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-structure-item:hover {
      border-color: ${customColor} !important;
      background-color: rgba(${hexToRgb(customColor)}, 0.05) !important;
    }

    .asw-container .asw-menu .asw-plus:hover,
    .asw-container .asw-menu .asw-minus:hover {
      border-color: ${customColor} !important;
      background-color: rgba(${hexToRgb(customColor)}, 0.1) !important;
    }

    .asw-container .asw-menu .asw-font-size-btn:hover {
      border-color: ${customColor} !important;
      background-color: rgba(${hexToRgb(customColor)}, 0.1) !important;
      color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-custom-dropdown-toggle:hover {
      border-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-card .asw-custom-dropdown-item:hover {
      background-color: rgba(${hexToRgb(customColor)}, 0.1) !important;
      color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-card .asw-custom-dropdown-item:hover span {
      color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-header-lang-selector:hover {
      border-color: ${customColor} !important;
      background-color: rgba(${hexToRgb(customColor)}, 0.1) !important;
    }

    .asw-container .asw-menu .asw-language-option:hover {
      background-color: rgba(${hexToRgb(customColor)}, 0.1) !important;
    }

    .asw-container .asw-menu .asw-color-btn:hover {
      border-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-cancel-btn:hover {
      color: ${customColor} !important;
    }

    .asw-container .asw-menu .submit-button:hover {
      background-color: ${customColor} !important;
      opacity: 0.9 !important;
    }

    .asw-container .asw-menu .cancel-button:hover {
      background-color: ${customColor} !important;
      opacity: 0.9 !important;
    }

    .asw-container .asw-menu .issue-type-button:hover {
      background-color: ${customColor} !important;
      opacity: 0.9 !important;
    }

    .asw-container .asw-menu .asw-info-button:hover {
      background-color: rgba(${hexToRgb(customColor)}, 0.2) !important;
    }

    .asw-container .asw-menu .asw-accessprofiles-dropdown-toggle:hover {
      border-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-lang-dropdown-toggle:hover {
      border-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-feature-toggle:hover {
      border-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-dark-mode-toggle:hover {
      border-color: ${customColor} !important;
    }

    .asw-container .asw-menu .widget-color-customize-btn:hover {
      border-color: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-widget-close:hover {
      background-color: rgba(${hexToRgb(customColor)}, 0.1) !important;
    }

    .asw-container .asw-menu .asw-widget-tab:hover {
      background-color: rgba(${hexToRgb(customColor)}, 0.1) !important;
    }

    .asw-container .asw-menu .asw-form-button:hover {
      background-color: rgba(${hexToRgb(customColor)}, 0.1) !important;
    }

    .asw-container .asw-menu .go-back-button:hover {
      background-color: rgba(${hexToRgb(customColor)}, 0.1) !important;
    }

    .asw-container .asw-menu .widget-color-cancel-btn:hover {
      color: ${customColor} !important;
    }

    /* Set CSS custom property for dropdown hover background */
    :root {
      --asw-dropdown-hover-bg: rgba(${hexToRgb(customColor)}, 0.1);
    }

    /* Hover states for SVG icons */
    .asw-container .asw-menu .asw-btn:hover svg,
    .asw-container .asw-menu .asw-btn:hover svg path,
    .asw-container .asw-menu .asw-btn:hover svg g,
    .asw-container .asw-menu .asw-btn:hover svg circle,
    .asw-container .asw-menu .asw-btn:hover svg rect,
    .asw-container .asw-menu .asw-btn:hover svg line,
    .asw-container .asw-menu .asw-btn:hover svg polyline,
    .asw-container .asw-menu .asw-btn:hover svg polygon {
      fill: ${customColor} !important;
    }
  `;

  document.head.appendChild(styleElement);
}

// Helper function to inject CSS for report issue form text styles
function injectReportIssueTextStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-report-issue-text-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules with maximum specificity
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Override hardcoded styles for report issue form text with maximum specificity */
    .asw-container .asw-menu #report-problem-form label,
    .asw-container .asw-menu #report-problem-form .asw-form-text,
    .asw-container .asw-menu #report-problem-form select {
      color: ${customColor} !important;
    }
  `;

  document.head.appendChild(styleElement);
}

// Helper function to inject CSS for report issue input text styles
function injectReportIssueInputTextStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-report-issue-input-text-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules with maximum specificity
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
          /* Override hardcoded styles for report issue input text content with maximum specificity */
          .asw-container .asw-menu #report-problem-form textarea,
          .asw-container .asw-menu #report-problem-form input[type='email'],
          .asw-container .asw-menu #report-problem-form select,
          .asw-container .asw-menu .checkbox-container input[type='checkbox'],
          .asw-container .asw-menu .checkbox-label {
            color: ${customColor} !important;
          }
        `;

  document.head.appendChild(styleElement);
}

// Helper function to inject CSS for report issue button styles
function injectReportIssueButtonStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-report-issue-button-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules with maximum specificity
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Override hardcoded styles for report issue buttons with maximum specificity */
    .asw-container .asw-menu .asw-form-button {
      color: ${customColor} !important;
    }
  `;

  document.head.appendChild(styleElement);
}

// Helper function to inject CSS for report issue button background styles
function injectReportIssueButtonBackgroundStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-report-issue-button-background-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules with maximum specificity
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Override hardcoded styles for report issue button backgrounds with maximum specificity */
    .asw-container .asw-menu .asw-form-button {
      background-color: ${customColor} !important;
      border-color: ${customColor} !important;
    }
    
    .asw-container .asw-menu .asw-form-button:hover {
      background-color: ${customColor} !important;
      opacity: 0.85 !important;
    }
  `;

  document.head.appendChild(styleElement);
}

// Helper function to inject CSS for report issue textbox background styles
function injectReportIssueTextboxBackgroundStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-report-issue-textbox-background-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules with maximum specificity
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Override hardcoded styles for report issue textbox backgrounds with maximum specificity */
    .asw-container .asw-menu #report-problem-form textarea,
    .asw-container .asw-menu #report-problem-form input[type='email'] {
      background-color: ${customColor} !important;
    }
    
    .asw-container .asw-menu #report-problem-form textarea:focus,
    .asw-container .asw-menu #report-problem-form input[type='email']:focus {
      background-color: ${customColor} !important;
      box-shadow: 0 0 0 3px ${customColor}33 !important;
    }
  `;

  document.head.appendChild(styleElement);
}

// Global variables to manage dropdown styling
let dropdownStyleInterval: NodeJS.Timeout | null = null;
let dropdownStyleObserver: MutationObserver | null = null;

// Helper function to apply dropdown styles with direct DOM manipulation
function applyDropdownStylesDirectly(
  cardBgColor: string,
  inputTextColor: string,
  buttonBgColor: string,
) {
  // Clear any existing interval and observer to prevent multiple instances
  if (dropdownStyleInterval) {
    clearInterval(dropdownStyleInterval);
    dropdownStyleInterval = null;
  }

  if (dropdownStyleObserver) {
    dropdownStyleObserver.disconnect();
    dropdownStyleObserver = null;
  }

  const applyStyles = () => {
    // Find the custom dropdown elements
    const dropdownToggle = document.querySelector(
      '#issue-type-dropdown-toggle',
    ) as HTMLButtonElement;
    const dropdownMenu = document.querySelector(
      '#issue-type-dropdown-menu',
    ) as HTMLElement;
    const dropdownItems = dropdownMenu?.querySelectorAll(
      '.asw-custom-dropdown-item',
    ) as NodeListOf<HTMLElement>;
    const dropdownIcon = dropdownToggle?.querySelector(
      '.asw-custom-dropdown-icon',
    ) as SVGElement;

    if (!dropdownToggle || !dropdownMenu || !dropdownItems) return;

    // Apply styles to dropdown toggle button
    dropdownToggle.style.setProperty(
      'background-color',
      cardBgColor,
      'important',
    );
    dropdownToggle.style.setProperty('color', inputTextColor, 'important');
    dropdownToggle.style.setProperty(
      'border',
      `1px solid ${inputTextColor}`,
      'important',
    );

    // Apply styles to dropdown icon
    if (dropdownIcon) {
      dropdownIcon.style.setProperty('color', inputTextColor, 'important');
      dropdownIcon.style.setProperty('stroke', inputTextColor, 'important');
    }

    // Apply styles to dropdown menu
    dropdownMenu.style.setProperty(
      'background-color',
      cardBgColor,
      'important',
    );
    dropdownMenu.style.setProperty(
      'border',
      `1px solid ${inputTextColor}`,
      'important',
    );
    dropdownMenu.style.setProperty('top', '100%', 'important');
    dropdownMenu.style.setProperty('bottom', 'auto', 'important');
    dropdownMenu.style.setProperty('margin-top', '4px', 'important');

    // Apply styles to all dropdown items
    dropdownItems.forEach((item: HTMLElement) => {
      const isSelected = item.getAttribute('aria-selected') === 'true';
      if (isSelected) {
        item.style.setProperty('background-color', buttonBgColor, 'important');
        item.style.setProperty('color', 'white', 'important');
      } else {
        item.style.setProperty('background-color', cardBgColor, 'important');
        item.style.setProperty('color', inputTextColor, 'important');
      }

      // Also style the span inside each item
      const itemSpan = item.querySelector('span');
      if (itemSpan) {
        if (isSelected) {
          itemSpan.style.setProperty('color', 'white', 'important');
        } else {
          itemSpan.style.setProperty('color', inputTextColor, 'important');
        }
      }
    });
  };

  // Apply styles immediately
  applyStyles();

  // Set up periodic reapplication to maintain consistency (less frequent to reduce blinking)
  dropdownStyleInterval = setInterval(applyStyles, 1000);

  // Also apply styles on dropdown item changes
  const dropdownMenu = document.querySelector(
    '#issue-type-dropdown-menu',
  ) as HTMLElement;
  if (dropdownMenu) {
    dropdownStyleObserver = new MutationObserver(applyStyles);
    dropdownStyleObserver.observe(dropdownMenu, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['aria-selected'],
    });
  }
}

// Helper function to inject CSS for toggle icon color
function injectToggleIconColorStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-toggle-icon-color-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules with maximum specificity
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Toggle icon color (sun and moon) with maximum specificity */
    .asw-container .asw-menu .asw-header-toggle-switch .sun svg,
    .asw-container .asw-menu .asw-header-toggle-switch .sun svg path {
      fill: ${customColor} !important;
    }

    .asw-container .asw-menu .asw-header-toggle-switch .moon svg,
    .asw-container .asw-menu .asw-header-toggle-switch .moon svg path {
      fill: ${customColor} !important;
    }
  `;

  document.head.appendChild(styleElement);
}

// Helper function to inject CSS for toggle background unchecked state
function injectToggleBgUncheckedStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-toggle-bg-unchecked-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules with maximum specificity
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Toggle background when unchecked (OFF state) with maximum specificity */
    .asw-container .asw-menu .asw-header-toggle-switch .slider {
      background-color: ${customColor} !important;
    }
  `;

  document.head.appendChild(styleElement);
}

// Helper function to inject CSS for toggle background checked state
function injectToggleBgCheckedStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-toggle-bg-checked-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules with maximum specificity
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Toggle background when checked (ON state) with maximum specificity */
    .asw-container .asw-menu .asw-header-toggle-switch input:checked + .slider {
      background-color: ${customColor} !important;
    }
  `;

  document.head.appendChild(styleElement);
}

// Helper function to inject CSS for report issue card and dropdown background styles
function injectReportIssueCardDropdownBackgroundStyles(
  customColor: string,
  inputTextColor: string,
  buttonBgColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-report-issue-card-dropdown-background-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Clear any existing dropdown styling intervals/observers when switching themes
  if (dropdownStyleInterval) {
    clearInterval(dropdownStyleInterval);
    dropdownStyleInterval = null;
  }

  if (dropdownStyleObserver) {
    dropdownStyleObserver.disconnect();
    dropdownStyleObserver = null;
  }

  // Create new style element with CSS rules with maximum specificity
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
          /* Override hardcoded styles for report issue card and dropdown backgrounds with maximum specificity */
          .asw-container .asw-menu #report-problem-form {
            background-color: ${customColor} !important;
          }
          
          /* Custom dropdown toggle button styling - Maximum specificity */
          .asw-container .asw-menu #report-problem-form #issue-type-dropdown-toggle,
          .asw-container .report-problem-menu #report-problem-form #issue-type-dropdown-toggle,
          .asw-container #report-problem-menu #report-problem-form #issue-type-dropdown-toggle,
          .asw-container .asw-menu #issue-type-dropdown-toggle,
          .asw-container .report-problem-menu #issue-type-dropdown-toggle,
          .asw-container #report-problem-menu #issue-type-dropdown-toggle {
            background-color: ${customColor} !important;
            color: ${inputTextColor} !important;
            border: 1px solid ${inputTextColor} !important;
          }
          
          .asw-container .asw-menu #issue-type-dropdown-toggle:hover,
          .asw-container .report-problem-menu #issue-type-dropdown-toggle:hover,
          .asw-container #report-problem-menu #issue-type-dropdown-toggle:hover {
            background-color: ${customColor} !important;
            border: 1px solid ${inputTextColor} !important;
          }
          
          .asw-container .asw-menu #issue-type-dropdown-toggle:focus,
          .asw-container .report-problem-menu #issue-type-dropdown-toggle:focus,
          .asw-container #report-problem-menu #issue-type-dropdown-toggle:focus {
            background-color: ${customColor} !important;
            border: 1px solid ${inputTextColor} !important;
            box-shadow: 0 0 0 2px ${inputTextColor}33 !important;
          }
          
          /* Custom dropdown icon styling */
          .asw-container .asw-menu #issue-type-dropdown-toggle .asw-custom-dropdown-icon,
          .asw-container .report-problem-menu #issue-type-dropdown-toggle .asw-custom-dropdown-icon,
          .asw-container #report-problem-menu #issue-type-dropdown-toggle .asw-custom-dropdown-icon {
            color: ${inputTextColor} !important;
            stroke: ${inputTextColor} !important;
          }
          
          /* Custom dropdown menu styling - Maximum specificity */
          .asw-container .asw-menu #issue-type-dropdown-menu,
          .asw-container .report-problem-menu #issue-type-dropdown-menu,
          .asw-container #report-problem-menu #issue-type-dropdown-menu {
            background-color: ${customColor} !important;
            border: 1px solid ${inputTextColor} !important;
            top: 100% !important;
            bottom: auto !important;
            margin-top: 4px !important;
          }
          
          /* Custom dropdown items styling - Maximum specificity */
          .asw-container .asw-menu #issue-type-dropdown-menu .asw-custom-dropdown-item,
          .asw-container .report-problem-menu #issue-type-dropdown-menu .asw-custom-dropdown-item,
          .asw-container #report-problem-menu #issue-type-dropdown-menu .asw-custom-dropdown-item {
            background-color: ${customColor} !important;
            color: ${inputTextColor} !important;
          }
          
          .asw-container .asw-menu #issue-type-dropdown-menu .asw-custom-dropdown-item:hover,
          .asw-container .report-problem-menu #issue-type-dropdown-menu .asw-custom-dropdown-item:hover,
          .asw-container #report-problem-menu #issue-type-dropdown-menu .asw-custom-dropdown-item:hover {
            background-color: ${buttonBgColor} !important;
            color: ${inputTextColor} !important;
          }
          
          /* Selected dropdown item styling - Maximum specificity */
          .asw-container .asw-menu #issue-type-dropdown-menu .asw-custom-dropdown-item[aria-selected="true"],
          .asw-container .report-problem-menu #issue-type-dropdown-menu .asw-custom-dropdown-item[aria-selected="true"],
          .asw-container #report-problem-menu #issue-type-dropdown-menu .asw-custom-dropdown-item[aria-selected="true"] {
            background-color: ${buttonBgColor} !important;
            color: white !important;
          }
          
          .asw-container .asw-menu #issue-type-dropdown-menu .asw-custom-dropdown-item[aria-selected="true"]:hover,
          .asw-container .report-problem-menu #issue-type-dropdown-menu .asw-custom-dropdown-item[aria-selected="true"]:hover,
          .asw-container #report-problem-menu #issue-type-dropdown-menu .asw-custom-dropdown-item[aria-selected="true"]:hover {
            background-color: ${buttonBgColor} !important;
            color: white !important;
          }
          
          /* Dropdown item text styling - unselected items */
          .asw-container .asw-menu #issue-type-dropdown-menu .asw-custom-dropdown-item:not([aria-selected="true"]) span,
          .asw-container .report-problem-menu #issue-type-dropdown-menu .asw-custom-dropdown-item:not([aria-selected="true"]) span,
          .asw-container #report-problem-menu #issue-type-dropdown-menu .asw-custom-dropdown-item:not([aria-selected="true"]) span {
            color: ${inputTextColor} !important;
          }

          /* Dropdown item text styling - selected items */
          .asw-container .asw-menu #issue-type-dropdown-menu .asw-custom-dropdown-item[aria-selected="true"] span,
          .asw-container .report-problem-menu #issue-type-dropdown-menu .asw-custom-dropdown-item[aria-selected="true"] span,
          .asw-container #report-problem-menu #issue-type-dropdown-menu .asw-custom-dropdown-item[aria-selected="true"] span {
            color: white !important;
          }
        `;

  targetDocument.head.appendChild(styleElement);
}

// Helper function to convert hex color to RGB values
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `${r}, ${g}, ${b}`;
  }
  return '0, 0, 0'; // fallback to black
}

// Helper function to inject CSS for card title styles with maximum specificity
function injectCardTitleStyles(
  customColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-card-title-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules with maximum specificity
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Override universal selector .asw-menu * with maximum specificity */
    .asw-container .asw-menu .asw-card-title,
    .asw-container .asw-menu .asw-color-title,
    .asw-container .asw-menu .font-size-text,
    .asw-container .asw-menu .asw-oversize-widget-container .asw-selected-lang,
    .asw-container .asw-menu .asw-accessprofiles-dropdown-toggle .asw-selected-lang {
      color: ${customColor} !important;
    }
  `;

  document.head.appendChild(styleElement);
}

// Helper function to inject CSS for selected items styling
function injectSelectedItemsStyles(
  selectedItemsColor: string,
  targetDocument: Document = document,
) {
  const styleId = 'asw-selected-items-styles';

  // Remove existing style if present
  const existingStyle = targetDocument.getElementById(styleId);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create new style element with CSS rules
  const styleElement = targetDocument.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = `
    /* Selected items styling - independent color control */
    .asw-container .asw-menu .asw-btn.asw-selected {
      background-color: ${selectedItemsColor} !important;
    }

    .asw-container .asw-menu .asw-btn.asw-selected .asw-label,
    .asw-container .asw-menu .asw-btn.asw-selected span:not(.asw-icon) {
      color: #ffffff !important;
    }

    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg,
    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg path,
    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg circle,
    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg rect,
    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg line,
    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg polyline,
    .asw-container .asw-menu .asw-btn.asw-selected .asw-icon svg polygon,
    .asw-container .asw-menu .asw-btn.asw-selected svg,
    .asw-container .asw-menu .asw-btn.asw-selected svg path,
    .asw-container .asw-menu .asw-btn.asw-selected svg circle,
    .asw-container .asw-menu .asw-btn.asw-selected svg rect {
      fill: #ffffff !important;
    }

    /* Font size buttons when selected */
    .asw-container .asw-menu .asw-font-size-btn.asw-selected {
      background-color: ${selectedItemsColor} !important;
      color: #ffffff !important;
    }

    /* Filter buttons when selected */
    .asw-container .asw-menu .asw-filter.asw-selected svg,
    .asw-container .asw-menu .asw-filter.asw-selected svg path {
      fill: #ffffff !important;
    }
    
    .asw-container .asw-menu .asw-filter.asw-selected .asw-label,
    .asw-container .asw-menu .asw-filter.asw-selected span {
      color: #ffffff !important;
    }

    /* Profile buttons when selected */
    .asw-container .asw-menu .profile-grid .asw-btn.asw-selected svg {
      fill: #ffffff !important;
    }

    .asw-container .asw-menu .profile-grid .asw-btn.asw-selected span {
      color: #ffffff !important;
    }

  `;

  document.head.appendChild(styleElement);
}

// Helper function to style a selected item
function styleSelectedItem(element: HTMLElement, selectedItemsColor: string) {
  // Apply background color
  element.style.setProperty(
    'background-color',
    selectedItemsColor,
    'important',
  );

  // Set all text and icons to white
  element
    .querySelectorAll(
      '.asw-label, .asw-icon, svg, svg path, svg circle, svg rect, svg line, svg polyline, svg polygon, span',
    )
    .forEach((el: any) => {
      if (
        el.tagName === 'svg' ||
        el.tagName === 'SVG' ||
        el.tagName === 'path' ||
        el.tagName === 'PATH' ||
        el.tagName === 'circle' ||
        el.tagName === 'CIRCLE' ||
        el.tagName === 'rect' ||
        el.tagName === 'RECT'
      ) {
        el.style.setProperty('fill', '#ffffff', 'important');
      } else if (!el.classList.contains('asw-icon')) {
        el.style.setProperty('color', '#ffffff', 'important');
      }
    });
}

export const sectionSelectors: Record<string, string | string[]> = {
  'header-background': '.asw-menu-header',
  'footer-background': '.asw-footer',
  'header-buttons-border': [
    '.asw-report-issue-btn',
    '.asw-header-lang-selector',
  ],
  'widget-background': ['.asw-menu-content', '.asw-menu', '.asw-modal-content'],
  'selected-language': [
    '.asw-language-list .asw-language-option.asw-language-selected',
    ".asw-custom-dropdown-item[aria-selected='true']",
  ],
  'modal-colors': [
    '.asw-confirmation-modal .asw-modal-btn-primary',
    '.asw-confirmation-modal .asw-modal-icon',
    '.asw-confirmation-modal .asw-modal-title',
  ],
  'dropdown-backgrounds': [
    '.asw-custom-dropdown-menu',
    '.asw-header-lang-selector .asw-lang-dropdown-content',
    '.asw-header-lang-selector .lang-card',
  ],
  'all-hover-states': [
    '.asw-btn:hover',
    '.asw-card:hover',
    '.asw-structure-item:hover',
    '.asw-plus:hover',
    '.asw-minus:hover',
    '.asw-font-size-btn:hover',
    '.asw-custom-dropdown-toggle:hover',
    '.asw-custom-dropdown-item:hover',
    '.asw-header-lang-selector:hover',
    '.asw-language-option:hover',
    '.asw-color-btn:hover',
    '.asw-cancel-btn:hover',
    '.submit-button:hover',
    '.cancel-button:hover',
    '.issue-type-button:hover',
    '.asw-info-button:hover',
    '.asw-accessprofiles-dropdown-toggle:hover',
    '.asw-lang-dropdown-toggle:hover',
    '.asw-feature-toggle:hover',
    '.asw-dark-mode-toggle:hover',
    '.widget-color-customize-btn:hover',
    '.asw-widget-close:hover',
    '.asw-widget-tab:hover',
    '.asw-form-button:hover',
    '.go-back-button:hover',
    '.widget-color-cancel-btn:hover',
  ],
  'all-border-lines': [
    '.asw-btn:not(.asw-report-issue-btn):not(.asw-header-lang-selector)',
    '.asw-font-size-btn',
    '.asw-select',
    '.asw-custom-dropdown-toggle',
    '.asw-custom-dropdown-menu',
    '.asw-search-input',
    '.asw-structure-section',
    '.asw-structure-item',
    '.asw-adjust-font',
    '.asw-plus',
    '.asw-minus',
    '.profile-grid .asw-btn',
    '.asw-color-section',
    '.asw-color-btn',
    '.asw-header-lang-selector .asw-lang-dropdown-content',
  ],
  'numbered-buttons': ['.asw-font-size-btn'],
  'selected-items': [
    '.asw-btn.asw-selected',
    '.asw-font-size-btn.asw-selected',
    '.asw-filter.asw-selected',
    '.profile-grid .asw-btn.asw-selected',
  ],

  // New section to target all SVG icons and text (excluding header and footer)
  'header-text': [
    '.asw-menu-title',
    '.asw-report-issue-btn',
    '.asw-header-lang-selector .asw-selected-lang',
  ],
  'card-titles': [
    '.asw-card-title',
    '.asw-color-title',
    '.font-size-text',
    '.asw-oversize-widget-container .asw-selected-lang',
    '.asw-accessprofiles-dropdown-toggle .asw-selected-lang',
  ],
  'header-icons': [
    '.asw-header-icon',
    '.asw-header-icon svg',
    '.asw-header-icon svg path',
    '.asw-header-icon svg circle',
    '.asw-header-icon svg rect',
    '.asw-header-icon svg line',
    '.asw-header-icon svg polyline',
    '.asw-header-icon svg polygon',
    '.asw-header-lang-selector .asw-dropdown-icon',
    '.asw-header-lang-selector .asw-dropdown-icon path',
    '.asw-header-lang-selector .asw-search-icon',
    '.asw-header-lang-selector .asw-search-icon path',
    '.asw-menu-header svg:not(.asw-header-icon)',
  ],
  'report-issue-text': [
    '#report-problem-form label',
    '#report-problem-form .asw-form-text',
    '#report-problem-form select',
  ],
  'report-issue-input-text': [
    '#report-problem-form textarea',
    "#report-problem-form input[type='email']",
    '#report-problem-form select',
    ".checkbox-container input[type='checkbox']",
    '.checkbox-label',
  ],
  'report-issue-buttons': ['.asw-form-button'],
  'report-issue-button-background': ['.asw-form-button'],
  'report-issue-textbox-background': [
    '#report-problem-form textarea',
    "#report-problem-form input[type='email']",
  ],
  'report-issue-card-dropdown-background': [
    '#report-problem-form',
    '#issue-type-dropdown-toggle',
  ],
  'report-issue-checkbox-background': ['.checkbox-container'],
  'all-icons-and-text': [
    '.asw-btn .asw-icon svg',
    '.asw-btn .asw-icon svg path',
    '.asw-btn .asw-icon svg circle',
    '.asw-btn .asw-icon svg rect',
    '.asw-btn .asw-icon svg line',
    '.asw-btn .asw-icon svg polyline',
    '.asw-btn .asw-icon svg polygon',
    '.asw-btn .fill-icon',
    '.asw-btn .stroke-icon',
    '.asw-btn .asw-label',
    '.asw-btn .asw-icon',
    '.inner-text',
    '.asw-voice-nav-icon',
    '.asw-voice-nav-icon path',
    '.asw-voice-nav-text',
    '.asw-heading-tag',
    '.asw-oversize-widget-label',
    '.asw-oversize-widget-label .asw-selected-lang',
    '.asw-oversize-widget-icon',
    '.asw-oversize-widget-icon path',
    '.asw-accessprofiles-dropdown-toggle .asw-selected-lang',
    '.asw-accessprofiles-dropdown-toggle svg',
    '.asw-accessprofiles-dropdown-toggle svg path',
    '.asw-header-lang-selector .asw-language-option:not(.selected) .asw-language-name',
    '.asw-header-lang-selector .asw-language-option',
    '.asw-header-lang-selector .asw-language-option:not(.selected)',
    '#widget-position-dropdown-toggle',
    '.asw-custom-dropdown-toggle',
    '.asw-custom-dropdown-text',
    '.asw-custom-dropdown-icon',
    ".asw-custom-dropdown-item[aria-selected='true']",
    '.asw-select',
    '.asw-amount',
    '.asw-minus',
    '.asw-plus',
    '.asw-minus svg',
    '.asw-plus svg',
    '.asw-minus svg path',
    '.asw-plus svg path',
    '.asw-color-btn',
    '.asw-cancel-btn',
    '.asw-report-issue-btn',
    '.settings-icon-btn',
    '.settings-icon-btn svg',
    '.settings-icon-btn svg path',
    '.asw-sr-speed-text',
    '.asw-voice-nav-text',
    '.asw-structure-item-text',
    '.asw-footer-text',
    '.footer-main-title',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ],
  'toggle-icon-color': [
    '.asw-header-toggle-switch .sun svg',
    '.asw-header-toggle-switch .sun svg path',
    '.asw-header-toggle-switch .moon svg',
    '.asw-header-toggle-switch .moon svg path',
  ],
  'toggle-bg-unchecked': ['.asw-header-toggle-switch .slider'],
  'toggle-bg-checked': ['.asw-header-toggle-switch input:checked + .slider'],
  'progress-bars': ['.asw-progress-bar', '.asw-progress-dot'],
};
export default function applyMenuColor(
  section: string,
  color: string,
  $menu: HTMLElement,
  $widgetContainer?: HTMLElement,
  targetDocument: Document = document,
) {
  // Define selectors for each section
  const selectors = sectionSelectors[section];
  if (!selectors) {
    console.warn('Unknown section:', section);
    return;
  }
  // Ensure selectors is treated as an array
  const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

  selectorArray.forEach((selector) => {
    // Handle header and footer background colors separately
    if (section === 'header-background' || section === 'footer-background') {
      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('background-color', color, 'important');
      });
      return;
    }

    // Handle selected language styling separately
    if (section === 'selected-language') {
      // Use the dedicated function for selected language styling
      injectSelectedLanguageStyles(color, targetDocument);
      return;
    }

    // Handle header buttons border color
    if (section === 'header-buttons-border') {
      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('border-color', color, 'important');
      });
      return;
    }

    // Handle all border lines
    if (section === 'all-border-lines') {
      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('border-color', color, 'important');
      });

      // Handle slider pseudo-elements by injecting CSS
      injectSliderBorderStyles(color, targetDocument);
      return;
    }

    // Handle numbered buttons (1,2,3,4,5)
    if (section === 'numbered-buttons') {
      // Store the numbered button color for future reference
      $menu.setAttribute('data-numbered-button-color', color);

      $menu.querySelectorAll(selector).forEach((el: any) => {
        // Only apply blue color to unselected buttons
        // Selected buttons will use the main theme color
        if (!el.classList.contains('asw-selected')) {
          el.style.setProperty('background-color', 'transparent', 'important');
          el.style.setProperty('color', color, 'important');
          el.style.setProperty('border', 'none', 'important');
        }
      });

      // Inject CSS for numbered buttons to override any conflicting styles
      injectNumberedButtonStyles(color, targetDocument);
      return;
    }

    // Handle selected items - independent color control for selected buttons/cards
    if (section === 'selected-items') {
      // Store the selected items color for future reference
      $menu.setAttribute('data-selected-items-color', color);

      // Inject CSS for selected items styling
      injectSelectedItemsStyles(color, targetDocument);

      // Apply styles directly to currently selected items
      $menu.querySelectorAll(selector).forEach((el: any) => {
        styleSelectedItem(el, color);
      });

      // Set up observer to handle future selections/deselections
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === 'attributes' &&
            mutation.attributeName === 'class'
          ) {
            const target = mutation.target as HTMLElement;
            if (target.classList.contains('asw-selected')) {
              styleSelectedItem(target, color);
            }
          }
        });
      });

      // Observe all potential selectable elements for class changes (excluding dropdowns)
      $menu
        .querySelectorAll('.asw-btn, .asw-font-size-btn, .asw-filter')
        .forEach((el: Element) => {
          observer.observe(el, {
            attributes: true,
            attributeFilter: ['class'],
          });
        });

      return;
    }

    // Handle widget background
    if (section === 'widget-background') {
      // Query widget elements from the widget container or document
      const widgetContainer =
        $widgetContainer || document.querySelector('.asw-container');
      const widgetElements = widgetContainer?.querySelectorAll(selector);

      widgetElements?.forEach((el: any) => {
        // Apply background color/gradient
        el.style.setProperty('background', color, 'important');
        // Apply outline color (slightly darker version of the color)
        el.style.setProperty('outline-color', color, 'important');
      });

      // Also handle modal content which might be outside the widget container
      if (selector === '.asw-modal-content') {
        document.querySelectorAll(selector).forEach((el: any) => {
          el.style.setProperty('background', color, 'important');
        });
      }

      return;
    }

    // Handle modal colors
    if (section === 'modal-colors') {
      // Modal elements might be outside the menu, so we need to search the entire document
      document.querySelectorAll(selector).forEach((el: any) => {
        if (selector.includes('.asw-modal-btn-primary')) {
          el.style.setProperty(
            'background',
            `linear-gradient(135deg, ${color} 0%, ${color} 100%)`,
            'important',
          );
          el.style.setProperty('border-color', color, 'important');
        } else if (selector.includes('.asw-modal-icon')) {
          el.style.setProperty(
            'box-shadow',
            `0 8px 25px ${color}26`,
            'important',
          );
          el.style.setProperty('border-color', color, 'important');
          // Also style the SVG inside the icon
          const svgPaths = el.querySelectorAll('svg path');
          svgPaths.forEach((path: any) => {
            path.style.setProperty('stroke', color, 'important');
            path.style.setProperty('fill', color, 'important');
          });
        } else if (selector.includes('.asw-modal-title')) {
          el.style.setProperty('color', color, 'important');
        }
      });
      return;
    }

    // Handle dropdown backgrounds
    if (section === 'dropdown-backgrounds') {
      // Inject CSS to override hardcoded white backgrounds in HTML
      injectDropdownBackgroundStyles(color, targetDocument);

      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('background-color', color, 'important');
      });
      return;
    }

    // Handle all hover states
    if (section === 'all-hover-states') {
      // Inject CSS to override all hover states
      injectAllHoverStyles(color, targetDocument);

      // Apply hover styles directly to elements (for immediate effect)
      $menu.querySelectorAll(selector).forEach((el: any) => {
        // Apply hover styles using CSS custom properties
        el.style.setProperty('--hover-color', color, 'important');
      });
      return;
    }

    // Handle header text
    if (section === 'header-text') {
      // Inject CSS to override hardcoded white styles in HTML
      injectHeaderTextStyles(color, targetDocument);

      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('color', color, 'important');
      });
      return;
    }

    // Handle card titles
    if (section === 'card-titles') {
      // Inject CSS to override universal selector
      injectCardTitleStyles(color, targetDocument);

      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('color', color, 'important');
      });
      return;
    }

    // Handle report issue text
    if (section === 'report-issue-text') {
      // Inject CSS to override hardcoded form styles
      injectReportIssueTextStyles(color, targetDocument);

      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('color', color, 'important');
      });
      return;
    }

    // Handle report issue input text
    if (section === 'report-issue-input-text') {
      // Store the input text color for dropdown styling
      $menu.setAttribute('data-report-issue-input-text-color', color);

      // Inject CSS to override hardcoded input text styles
      injectReportIssueInputTextStyles(color, targetDocument);

      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('color', color, 'important');
      });
      return;
    }

    // Handle report issue buttons
    if (section === 'report-issue-buttons') {
      // Inject CSS to override hardcoded button text styles
      injectReportIssueButtonStyles(color, targetDocument);

      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('color', color, 'important');
      });
      return;
    }

    // Handle report issue button backgrounds
    if (section === 'report-issue-button-background') {
      // Store the button background color for dropdown styling
      $menu.setAttribute('data-report-issue-button-bg-color', color);

      // Inject CSS to override hardcoded button background styles
      injectReportIssueButtonBackgroundStyles(color, targetDocument);

      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('background-color', color, 'important');
        el.style.setProperty('border-color', color, 'important');
      });
      return;
    }

    // Handle report issue textbox backgrounds
    if (section === 'report-issue-textbox-background') {
      // Inject CSS to override hardcoded textbox background styles
      injectReportIssueTextboxBackgroundStyles(color, targetDocument);

      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('background-color', color, 'important');
      });
      return;
    }

    // Handle report issue card and dropdown backgrounds
    if (section === 'report-issue-card-dropdown-background') {
      // Get the input text color and button background color from menu attributes
      const inputTextColor =
        $menu.getAttribute('data-report-issue-input-text-color') || '#10b981';
      const buttonBgColor =
        $menu.getAttribute('data-report-issue-button-bg-color') || '#8b5cf6';

      // Inject CSS to override hardcoded card and dropdown background styles
      injectReportIssueCardDropdownBackgroundStyles(
        color,
        inputTextColor,
        buttonBgColor,
        targetDocument,
      );

      // Apply direct DOM manipulation for dropdown consistency
      setTimeout(() => {
        applyDropdownStylesDirectly(color, inputTextColor, buttonBgColor);
      }, 100);

      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('background-color', color, 'important');
      });
      return;
    }

    // Handle header icons
    if (section === 'header-icons') {
      // Inject CSS to override hardcoded white styles in HTML
      injectHeaderIconStyles(color, targetDocument);

      $menu.querySelectorAll(selector).forEach((el: any) => {
        // Handle SVG elements
        if (el.tagName === 'svg' || el.tagName === 'SVG') {
          el.style.setProperty('fill', color, 'important');
        }
        // Handle SVG child elements (path, circle, etc.)
        else if (
          el.tagName === 'path' ||
          el.tagName === 'PATH' ||
          el.tagName === 'circle' ||
          el.tagName === 'CIRCLE' ||
          el.tagName === 'rect' ||
          el.tagName === 'RECT' ||
          el.tagName === 'line' ||
          el.tagName === 'LINE' ||
          el.tagName === 'polyline' ||
          el.tagName === 'POLYLINE' ||
          el.tagName === 'polygon' ||
          el.tagName === 'POLYGON'
        ) {
          el.style.setProperty('fill', color, 'important');
        }
        // Handle other elements (like icons with classes)
        else {
          el.style.setProperty('color', color, 'important');
          el.style.setProperty('fill', color, 'important');
        }
      });
      return;
    }

    // Handle toggle icon color (sun/moon icons)
    if (section === 'toggle-icon-color') {
      // Inject CSS to override hardcoded icon styles
      injectToggleIconColorStyles(color, targetDocument);

      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('fill', color, 'important');
      });
      return;
    }

    // Handle toggle background unchecked state
    if (section === 'toggle-bg-unchecked') {
      // Inject CSS to override hardcoded background styles
      injectToggleBgUncheckedStyles(color, targetDocument);

      $menu.querySelectorAll(selector).forEach((el: any) => {
        el.style.setProperty('background-color', color, 'important');
      });
      return;
    }

    // Handle toggle background checked state
    if (section === 'toggle-bg-checked') {
      // Inject CSS to override hardcoded background styles
      injectToggleBgCheckedStyles(color, targetDocument);

      // Apply directly to checked state if toggle is currently checked
      const checkedToggles = $menu.querySelectorAll(
        '.asw-header-toggle-switch input:checked + .slider',
      );
      checkedToggles.forEach((el: any) => {
        el.style.setProperty('background-color', color, 'important');
      });
      return;
    }

    // Handle progress bars (for all cycling buttons)
    if (section === 'progress-bars') {
      $menu.querySelectorAll(selector).forEach((el: any) => {
        if (el.classList.contains('asw-progress-bar')) {
          // Update progress bar background (only visible when button is selected)
          el.style.setProperty(
            'background',
            `linear-gradient(90deg, ${color} 0%, ${color} 100%)`,
            'important',
          );
        } else if (el.classList.contains('asw-progress-dot')) {
          // Update dot colors (only visible when button is selected)
          // Use semi-transparent white for better visibility
          const dotColor = `${color}66`; // Adding 40% opacity
          el.style.setProperty('background', dotColor, 'important');
        }
      });
      return;
    }

    if (section === 'all-icons-and-text') {
      $menu.querySelectorAll(selector).forEach((el: any) => {
        // Skip elements that are inside header, footer, or selected buttons
        // Selected buttons are now handled by injected CSS
        if (
          el.closest('.asw-menu-header') ||
          el.closest('.asw-footer') ||
          el.closest('.asw-btn.asw-selected')
        ) {
          return;
        }

        // Skip font size buttons and their children - they're handled separately by "numbered-buttons" section
        if (el.classList && el.classList.contains('asw-font-size-btn')) {
          return;
        }
        if (el.closest('.asw-font-size-btn')) {
          return;
        }

        // Handle SVG elements
        if (el.tagName === 'svg' || el.tagName === 'SVG') {
          el.style.setProperty('fill', color, 'important');
        }
        // Handle SVG child elements (path, circle, etc.)
        else if (
          el.tagName === 'path' ||
          el.tagName === 'PATH' ||
          el.tagName === 'circle' ||
          el.tagName === 'CIRCLE' ||
          el.tagName === 'rect' ||
          el.tagName === 'RECT' ||
          el.tagName === 'line' ||
          el.tagName === 'LINE' ||
          el.tagName === 'polyline' ||
          el.tagName === 'POLYLINE' ||
          el.tagName === 'polygon' ||
          el.tagName === 'POLYGON'
        ) {
          el.style.setProperty('fill', color, 'important');
        }
        // Handle icons with fill-icon or stroke-icon class
        else if (el.classList.contains('fill-icon')) {
          el.style.setProperty('fill', color, 'important');
          el.style.setProperty('color', color, 'important');
        } else if (el.classList.contains('stroke-icon')) {
          el.style.setProperty('color', color, 'important');
        }
        // Handle text elements
        else {
          el.style.setProperty('color', color, 'important');

          // Also apply to any SVG children within the text element
          const svgChildren = el.querySelectorAll('svg, svg *');
          svgChildren.forEach((svgEl: any) => {
            svgEl.style.setProperty('fill', color, 'important');
          });
        }
      });

      // Store the custom color for future reference
      $menu.setAttribute('data-custom-icon-color', color);

      // Set CSS custom properties for button borders
      setButtonBorderColors(color, $menu);

      // Inject CSS styles for selected buttons
      injectSelectedButtonStyles(color, targetDocument);

      // Helper function to style selected buttons
      const styleSelectedButton = (btn: any) => {
        btn.style.setProperty('background-color', color, 'important');
        // Border color is now handled by CSS custom properties

        // Set all text and icons to white
        btn
          .querySelectorAll(
            '.asw-label, .asw-icon, svg, svg path, svg circle, svg rect, svg line, svg polyline, svg polygon, span',
          )
          .forEach((el: any) => {
            if (
              el.tagName === 'svg' ||
              el.tagName === 'SVG' ||
              el.tagName === 'path' ||
              el.tagName === 'PATH' ||
              el.tagName === 'circle' ||
              el.tagName === 'CIRCLE' ||
              el.tagName === 'rect' ||
              el.tagName === 'RECT'
            ) {
              el.style.setProperty('fill', '#ffffff', 'important');
            } else if (!el.classList.contains('asw-icon')) {
              el.style.setProperty('color', '#ffffff', 'important');
            }
          });
      };

      // Helper function to style unselected buttons
      const styleUnselectedButton = (btn: any) => {
        // Remove selected button styles
        btn.style.removeProperty('background-color');
        // Border color is now handled by CSS custom properties

        // Reset text and icons to custom color
        btn
          .querySelectorAll(
            '.asw-label, .asw-icon, svg, svg path, svg circle, svg rect, svg line, svg polyline, svg polygon, span',
          )
          .forEach((el: any) => {
            if (
              el.tagName === 'svg' ||
              el.tagName === 'SVG' ||
              el.tagName === 'path' ||
              el.tagName === 'PATH' ||
              el.tagName === 'circle' ||
              el.tagName === 'CIRCLE' ||
              el.tagName === 'rect' ||
              el.tagName === 'RECT'
            ) {
              el.style.setProperty('fill', color, 'important');
            } else if (!el.classList.contains('asw-icon')) {
              el.style.setProperty('color', color, 'important');
            }
          });
      };

      // Apply styles directly to currently selected buttons
      $menu
        .querySelectorAll('.asw-btn.asw-selected')
        .forEach(styleSelectedButton);

      // Set up observer to handle future selections/deselections
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === 'attributes' &&
            mutation.attributeName === 'class'
          ) {
            const target = mutation.target as HTMLElement;
            if (target.classList.contains('asw-btn')) {
              if (target.classList.contains('asw-selected')) {
                styleSelectedButton(target);
              } else {
                styleUnselectedButton(target);
              }
            }
          }
        });
      });

      // Observe all buttons for class changes
      $menu.querySelectorAll('.asw-btn').forEach((btn: Element) => {
        observer.observe(btn, { attributes: true, attributeFilter: ['class'] });
      });
    }
  });
}
