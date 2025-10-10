import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@apollo/client';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
} from '@mui/material';
import { HiDownload, HiClipboardCopy } from 'react-icons/hi';
import { MdOutlineGavel, MdCode, MdTextFields } from 'react-icons/md';
import { FaFileAlt, FaCode } from 'react-icons/fa';
import { toast } from 'sonner';
import noReportFoundImage from '@/assets/images/no-report-found.png';
import TourGuide from '@/components/Common/TourGuide';
import { defaultTourStyles } from '@/config/tourStyles';
import { statementGeneratorTourSteps, tourKeys } from '@/constants/toursteps';
import translateStatementMutation from '@/queries/translation/translateStatement';
import { IS_PROD } from '@/config/env';

interface StatementFormData {
  companyName: string;
  websiteUrl: string;
  contactEmail: string;
  language: string;
  industry: string;
  widgetBrandName?: string;
  widgetBrandUrl?: string;
  phoneNumber?: string;
  visitorAddress?: string;
  postalAddress?: string;
  onlineFormUrl?: string;
}

const StatementGenerator: React.FC = () => {
  const { t } = useTranslation();
  useDocumentHeader({ title: t('Common.title.statement_generator') });

  const [formData, setFormData] = useState<StatementFormData>({
    companyName: '',
    websiteUrl: '',
    contactEmail: '',
    language: 'en',
    industry: '',
    widgetBrandName: 'WebAbility.io',
    widgetBrandUrl: 'https://webability.io',
    phoneNumber: '',
    visitorAddress: '',
    postalAddress: '',
    onlineFormUrl: '',
  });

  const [generatedStatement, setGeneratedStatement] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedFormat, setSelectedFormat] = useState<
    'markdown' | 'html' | 'text'
  >('markdown');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showEnhanceOptions, setShowEnhanceOptions] = useState<boolean>(false);
  const [languageSearch, setLanguageSearch] = useState<string>('');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] =
    useState<boolean>(false);
  const [showOptionalFields, setShowOptionalFields] = useState<boolean>(false);
  const [showEnhancePage, setShowEnhancePage] = useState<boolean>(false);
  const [selectedEnhancements, setSelectedEnhancements] = useState<string[]>(
    [],
  );

  const [translateStatement, { loading: isTranslating }] = useMutation(
    translateStatementMutation,
  );

  // Clear translation cache function
  const clearTranslationCache = () => {
    const keys = Object.keys(localStorage);
    const translationKeys = keys.filter((key) =>
      key.startsWith('translation_'),
    );
    translationKeys.forEach((key) => localStorage.removeItem(key));
    toast.success(`Cleared ${translationKeys.length} cached translations`);
  };

  // Debouncing and batching refs
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranslationRef = useRef<{
    formDataKey: string;
    timestamp: number;
  } | null>(null);

  // Enhanced contextual translation with OpenRouter
  const callOpenRouterTranslation = useCallback(
    async (
      englishContent: any,
      targetLanguageName: string,
      langCode: string,
      enhancement?: string,
    ) => {
      try {
        // Enhanced cache key with content hash for better cache invalidation
        const contentHash = JSON.stringify(englishContent).slice(0, 50);
        const cacheKey = `translation_v4_${langCode}_${
          enhancement || 'default'
        }_${contentHash}`;

        // Check cache with improved error handling
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsedCache = JSON.parse(cached);
            const cacheAge = Date.now() - parsedCache.timestamp;
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days for production

            if (cacheAge < maxAge && parsedCache.translation) {
              return parsedCache.translation;
            }
          } catch {
            localStorage.removeItem(cacheKey);
          }
        }

        // Build enhanced prompt with context
        const enhancedPrompt = `You are a professional translator specializing in accessibility and legal documents for the ${
          formData.industry || 'business'
        } industry.

Translate the following accessibility statement content from English to ${targetLanguageName}.

CRITICAL REQUIREMENTS:
1. Use formal, professional legal language appropriate for ${targetLanguageName}
2. Preserve these technical terms exactly: WCAG, ADA, Section 508, ARIA, NVDA, JAWS, VoiceOver, TalkBack
3. Keep URLs, email addresses, and brand names unchanged
4. Maintain the exact same JSON structure
5. Use official accessibility terminology in ${targetLanguageName}
6. Sound natural to native ${targetLanguageName} speakers
7. Maintain legal/compliance tone appropriate for accessibility statements
8. ABSOLUTELY FORBIDDEN: Never mix languages - translate ALL text to ${targetLanguageName}
9. FORBIDDEN PHRASES: Never use "At [company]", "using", "and", "This statement", "Last updated" - translate everything
10. REPLACE PATTERNS: "At dsad," → translate to proper ${targetLanguageName} equivalent like "dsad-এ" for Bengali
11. CHECK FOR: Any English words like "At", "using", "and manual", "This statement" - must be translated
12. Use consistent terminology throughout the document
13. Format dates appropriately for the target culture
14. CHECK EVERY SENTENCE: Ensure no English words remain except technical terms and URLs

${
  enhancement
    ? `SPECIAL FOCUS: ${enhancement.replace('add-', 'Emphasize ')}`
    : ''
}

LANGUAGE-SPECIFIC GUIDELINES:
- For Arabic: Use formal Arabic (فصحى), maintain right-to-left text flow, use appropriate date formatting
- For Spanish: Use formal register, proper regional variations, maintain professional tone
- For French: Use formal French (tutoiement), proper accents, maintain legal terminology
- For German: Use formal Sie form, compound words appropriately, maintain technical precision
- For Chinese: Use simplified/traditional as appropriate, formal register, proper measure words
- For Japanese: Use formal keigo when appropriate, maintain respectful tone
- For Korean: Use formal speech levels, maintain honorific system
- For Portuguese: Use formal register, distinguish Brazil/Portugal variants if needed
- For Russian: Use formal register, proper cases, maintain official terminology
- For Italian: Use formal register, proper conjugations, maintain professional tone
- For Dutch: Use formal register, proper compound words, maintain technical accuracy
- For technical terms: Keep English terms like "WCAG 2.1 AA" but translate explanatory text
- For company names: Keep original name but translate context around it
- For dates: Use culturally appropriate date formats for each language/region
- For currency/numbers: Use appropriate formatting conventions for target locale

CONTENT TO TRANSLATE:
${JSON.stringify(englishContent, null, 2)}

Return ONLY a valid JSON object with the same structure, with all values professionally translated to ${targetLanguageName}:`;

        // Call translation service with timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error('Translation request timed out. Please try again.'),
              ),
            45000,
          ),
        );

        const translationPromise = translateStatement({
          variables: {
            content: enhancedPrompt,
            targetLanguage: targetLanguageName,
            languageCode: langCode,
            context: JSON.stringify({
              domain: 'accessibility-legal',
              documentType: 'compliance-statement',
              industry: formData.industry,
              enhancement: enhancement,
            }),
          },
        });

        const { data } = (await Promise.race([
          translationPromise,
          timeoutPromise,
        ])) as any;

        if (!data?.translateStatement?.success) {
          throw new Error(
            data?.translateStatement?.error || 'Translation failed',
          );
        }

        const translatedContent = data.translateStatement.translatedContent;

        if (!translatedContent) {
          throw new Error('No translation content received');
        }

        // Parse the JSON response back to object
        let parsedContent;
        try {
          // Clean up markdown code blocks if present
          let cleanedContent = translatedContent;
          if (typeof translatedContent === 'string') {
            // Remove markdown code block wrapper if present
            cleanedContent = translatedContent
              .replace(/^```json\s*/m, '')
              .replace(/\s*```$/m, '')
              .trim();
          }

          parsedContent = JSON.parse(cleanedContent);
        } catch (error) {
          throw new Error(
            'Translation service temporarily unavailable. Please try again.',
          );
        }

        // Cache the result
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            translation: parsedContent,
            timestamp: Date.now(),
          }),
        );

        return parsedContent;
      } catch (error) {
        console.error(`Translation failed for ${targetLanguageName}:`, error);

        // Fallback to pre-translated content if available
        const preTranslatedContent = getPreTranslatedContent(langCode);
        if (preTranslatedContent) {
          return preTranslatedContent;
        }

        // Final fallback to English
        toast.error(
          `Translation to ${targetLanguageName} failed, using English`,
        );
        return englishContent;
      }
    },
    [translateStatement, formData.industry],
  );

  // Get comprehensive English translations as the base template
  const getEnglishTranslations = (
    enhancement?: string,
    brandName?: string,
    brandUrl?: string,
  ) => {
    const widgetBrand = brandName || 'WebAbility.io';
    const widgetUrl = brandUrl || 'https://webability.io';
    const baseTemplate = {
      title: 'Accessibility Statement for',
      general: 'General',
      measures: 'Measures to support accessibility',
      conformance: 'Conformance status',
      technical: 'Technical specifications',
      assessment: 'Assessment approach',
      widget: `${widgetBrand} Accessibility Widget`,
      profiles: 'Accessibility profiles for people with disabilities',
      features: 'Additional accessibility features',
      feedback: 'Feedback',
      compatibility: 'Compatibility with browsers and assistive technology',
      limitations: 'Known limitations and alternatives',
      compliance: 'Assessment of current compliance',
      approval: 'Formal approval of this accessibility statement',
      generated: `This accessibility statement was generated using ${widgetBrand}'s AI Statement Generator on`,
      commitment:
        'is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone, and applying the relevant accessibility standards to create an inclusive digital environment.',
      belief:
        'we believe that digital accessibility is not just a legal requirement but a fundamental human right. We strive to ensure that our website',
      accessible:
        'is accessible to all users, regardless of their abilities or the assistive technologies they use.',
      orgMeasures: 'Organizational Measures',
      techMeasures: 'Technical Measures',
      takesComprehensive:
        'takes the following comprehensive measures to ensure accessibility of',
      orgMeasuresList: `- Include accessibility as part of our mission statement and core values
- Include accessibility throughout our internal policies and procedures
- Integrate accessibility into our procurement practices and vendor requirements
- Appoint an accessibility officer and/or ombudsperson with dedicated responsibilities
- Provide continual accessibility training for our staff, including developers, designers, and content creators
- Assign clear accessibility goals and responsibilities across departments
- Employ formal accessibility quality assurance methods and testing protocols`,
      techMeasuresList: `- Regular accessibility audits using automated and manual testing tools
- Implementation of [WCAG 2.1 AA guidelines](https://www.w3.org/WAI/WCAG21/quickref/) across all digital properties
- User testing with people with disabilities to validate real-world accessibility
- Continuous monitoring and improvement of accessibility features`,
      techIntro:
        'relies on the following technologies to work with the particular combination of web browser and any assistive technologies or plugins installed on your computer:',
      techList: `- **HTML5:** Semantic markup for proper document structure
- **WAI-ARIA:** Advanced accessibility attributes for complex interactions
- **CSS3:** Responsive design and accessibility-friendly styling
- **JavaScript:** Progressive enhancement for accessibility features`,
      techNote:
        'These technologies are relied upon for conformance with the accessibility standards used. Our website is built with progressive enhancement principles, ensuring core functionality remains available even if JavaScript is disabled.',
      assessmentIntro: 'assessed the accessibility of',
      assessmentBy: 'by the following approaches:',
      automatedTesting: 'Automated Testing',
      automatedList: `- Regular automated accessibility scanning using [${widgetBrand}'s accessibility testing platform](${widgetUrl})
- Integration with development workflow for continuous accessibility monitoring
- Monthly comprehensive accessibility audits`,
      manualTesting: 'Manual Testing',
      manualList: `- Expert accessibility reviews by certified accessibility professionals
- Keyboard navigation testing across all interactive elements
- Screen reader testing with NVDA, JAWS, VoiceOver, and TalkBack
- Color contrast verification meeting WCAG AA standards`,
      userTesting: 'User Testing',
      userList: `- Usability testing with people with disabilities
- Feedback collection from users of assistive technologies
- Regular accessibility user experience studies`,
      widgetIntro: `This website is equipped with [${widgetBrand}'s accessibility widget](${widgetUrl}) to provide additional assistive features that go beyond standard web accessibility requirements:`,
      profilesIntro:
        'Our accessibility widget includes specialized profiles designed for different types of disabilities:',
      profilesList: `- **Seizure Safe Profile:** Eliminates flashes and reduces color that could trigger seizures
- **Vision Impaired Profile:** Enhances the website\'s visuals for users with visual impairments
- **ADHD Friendly Profile:** Reduces distractions and improves focus for users with ADHD
- **Cognitive Disability Profile:** Provides additional reading and focusing assistance
- **Keyboard Navigation Profile:** Optimizes the website for keyboard-only navigation
- **Blind Users Profile:** Optimizes the website for screen-reader compatibility`,
      featuresIntro:
        'Additional accessibility features available through our widget:',
      featuresList: `- **Text Adjustments:** Font size increases up to 200%, font family changes to readable fonts
- **Color & Contrast:** High contrast mode, color adjustments for colorblind users
- **Content Highlighting:** Link highlighting, button emphasis, and content structure emphasis
- **Navigation Aids:** Reading guides, rulers, and content magnification
- **Motor Impairments:** Focus indicators enhancement, click area enlargement
- **Animation Controls:** Pause animations, reduce motion for vestibular disorders`,
      feedbackIntro: 'We welcome your feedback on the accessibility of',
      feedbackNote:
        'Please let us know if you encounter accessibility barriers on our website:',
      contactInfo: 'Accessibility Contact Information:',
      contactList: `- **Phone:** {phone}
- **E-mail:** {email}
- **Online Form:** {onlineForm}
- **Visitor Address:** {visitorAddress}
- **Postal Address:** {postalAddress}`,
      responseTime:
        'We try to respond to accessibility feedback within 2-3 business days and resolve reported issues within 5-10 business days, depending on complexity.',
      compatibilityIntro:
        'is designed to be compatible with the following assistive technologies:',
      compatibilityIntroText:
        'is designed to be compatible with the following assistive technologies:',
      screenReaders: 'Screen Readers',
      screenReadersList: `- **NVDA** (Windows) - Fully supported with regular testing
- **JAWS** (Windows) - Comprehensive compatibility and optimization
- **VoiceOver** (macOS/iOS) - Native Apple screen reader support
- **TalkBack** (Android) - Mobile accessibility optimization
- **Dragon NaturallySpeaking** - Voice recognition software compatibility`,
      browsers: 'Browsers',
      browsersList: `- Recent versions of major browsers including Chrome, Firefox, Safari, and Edge
- Mobile browsers on iOS Safari and Android Chrome
- Browser zoom up to 200% without horizontal scrolling
- High contrast mode support across all browsers`,
      otherAssistive: 'Other Assistive Technology',
      otherAssistiveList: `- Voice recognition software (Dragon, Windows Speech Recognition)
- Switch navigation devices and software
- Eye-tracking systems and head mouse devices
- Alternative keyboards and input devices
- Magnification software (ZoomText, MAGic)`,
      limitationsIntro: 'Despite our best efforts to ensure accessibility of',
      limitationsText:
        'there may be some limitations. Below is a description of known limitations, and potential solutions. Please contact us if you observe an issue not listed below.',
      knownLimitations: 'Known limitations for',
      limitation1:
        '**Third-party Content:** Some embedded content from third-party providers (social media widgets, videos, maps) may not be fully accessible. We work with vendors to ensure accessibility compliance.',
      limitation2:
        '**Legacy PDF Documents:** Some older PDF documents may not be fully accessible. We are systematically reviewing and updating these documents to meet accessibility standards.',
      limitation3:
        '**Live Content:** Real-time content such as live chat or dynamic updates may have accessibility limitations. We provide alternative methods to access this information.',
      whatWereDoing: "What we're doing:",
      whatWeDoList: `- Continuous accessibility improvements and updates
- Regular third-party vendor accessibility reviews
- Proactive identification and resolution of accessibility barriers
- User feedback integration into our development process`,
      aboutStatement: 'About This Statement',
      statementGenerated: 'This statement was created on',
      aiGenerator: 'AI-powered accessibility statement generator',
      lastReviewed:
        'The website was last reviewed for accessibility compliance on',
      complianceStatus: 'Accessibility Standards Compliance:',
      approvedBy: 'This Accessibility Statement is approved by:',
      accessibilityOfficer: 'Accessibility Officer',
      statementDetails: 'Statement Details:',
      complianceLevel: 'Compliance Level:',
      nextReviewDate: 'Next Review Date:',
      poweredBy: 'Powered by',
      makingWebAccessible: 'Making the web accessible for everyone.',
      wcagDescription:
        'The [Web Content Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/Understanding/) defines requirements for designers and developers to improve accessibility for people with disabilities. It defines three levels of conformance: Level A, Level AA, and Level AAA.',
      fullyConformant:
        'is fully conformant with [WCAG 2.1 level AA](https://www.w3.org/WAI/WCAG21/quickref/?currentsidebar=%23col_overview&levels=aaa&technologies=smil%2Cpdf%2Cflash%2Csl). Fully conformant means that the content fully meets the accessibility standard without any exceptions.',
      complianceList: `This website also complies with:
- [Section 508 of the Rehabilitation Act](https://www.section508.gov/)
- [Americans with Disabilities Act (ADA)](https://www.ada.gov/resources/web-guidance/)
- [EN 301 549 European Standard](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf)`,
    };

    // Apply enhancements to the template
    if (enhancement === 'add-testing') {
      baseTemplate.automatedList = `- Regular automated accessibility scanning using [${widgetBrand}'s accessibility testing platform](${widgetUrl})
- Integration with development workflow for continuous accessibility monitoring
- Monthly comprehensive accessibility audits
- **Enhanced Testing:** Use of industry-standard tools including axe-core, WAVE, Lighthouse, and Pa11y
- **Continuous Integration:** Automated accessibility testing in CI/CD pipeline
- **Performance Testing:** Regular testing of accessibility features under load`;
    }

    if (enhancement === 'add-timeline') {
      baseTemplate.responseTime =
        'We try to respond to accessibility feedback within 2-3 business days and resolve reported issues within 5-10 business days, depending on complexity. **Enhanced Timeline:** Priority issues are addressed within 24 hours, and we provide regular status updates throughout the resolution process.';
    }

    if (enhancement === 'add-training') {
      baseTemplate.orgMeasuresList = `- Include accessibility as part of our mission statement and core values
- Include accessibility throughout our internal policies and procedures
- Integrate accessibility into our procurement practices and vendor requirements
- Appoint an accessibility officer and/or ombudsperson with dedicated responsibilities
- **Enhanced Training Program:** Comprehensive accessibility training for all staff including developers, designers, content creators, and customer service
- **Certification Programs:** Staff receive IAAP (International Association of Accessibility Professionals) certification
- **Regular Workshops:** Monthly accessibility workshops covering latest standards and assistive technologies
- Assign clear accessibility goals and responsibilities across departments
- Employ formal accessibility quality assurance methods and testing protocols`;
    }

    if (enhancement === 'add-standards') {
      baseTemplate.complianceList = `This website also complies with:
- [Section 508 of the Rehabilitation Act](https://www.section508.gov/)
- [Americans with Disabilities Act (ADA)](https://www.ada.gov/resources/web-guidance/)
- [EN 301 549 European Standard](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf)
- **Additional Standards:** ISO/IEC 40500:2012, BITV 2.0 (Germany), RGAA 4.1 (France)
- **Industry Compliance:** W3C WAI-ARIA 1.2, HTML5 accessibility specifications
- **Mobile Standards:** W3C Mobile Accessibility Guidelines`;
    }

    return baseTemplate;
  };

  // Pre-translated content for key languages (fallback)
  const getPreTranslatedContent = (_langCode: string) => {
    // Return null for now - will fall back to English
    // In a full implementation, this would contain pre-translated templates
    return null;
  };

  const languages = [
    { code: 'en', name: 'English', englishName: 'English' },
    { code: 'ar', name: 'العربية', englishName: 'Arabic' },
    { code: 'bg', name: 'Български', englishName: 'Bulgarian' },
    { code: 'bn', name: 'বাংলা', englishName: 'Bengali' },
    { code: 'cs', name: 'Čeština', englishName: 'Czech' },
    { code: 'de', name: 'Deutsch', englishName: 'German' },
    { code: 'el', name: 'Ελληνικά', englishName: 'Greek' },
    { code: 'es', name: 'Español', englishName: 'Spanish' },
    { code: 'fi', name: 'Suomi', englishName: 'Finnish' },
    { code: 'fr', name: 'Français', englishName: 'French' },
    { code: 'he', name: 'עברית', englishName: 'Hebrew' },
    { code: 'hi', name: 'हिन्दी', englishName: 'Hindi' },
    { code: 'hr', name: 'Hrvatski', englishName: 'Croatian' },
    { code: 'hu', name: 'Magyar', englishName: 'Hungarian' },
    { code: 'id', name: 'Bahasa Indonesia', englishName: 'Indonesian' },
    { code: 'it', name: 'Italiano', englishName: 'Italian' },
    { code: 'ja', name: '日本語', englishName: 'Japanese' },
    { code: 'ko', name: '한국어', englishName: 'Korean' },
    { code: 'lt', name: 'Lietuvių', englishName: 'Lithuanian' },
    { code: 'lv', name: 'Latviešu', englishName: 'Latvian' },
    { code: 'ms', name: 'Bahasa Melayu', englishName: 'Malay' },
    { code: 'nl', name: 'Nederlands', englishName: 'Dutch' },
    { code: 'no', name: 'Norsk', englishName: 'Norwegian' },
    { code: 'pl', name: 'Polski', englishName: 'Polish' },
    { code: 'pt', name: 'Português', englishName: 'Portuguese' },
    {
      code: 'pt-br',
      name: 'Português (Brasil)',
      englishName: 'Portuguese (Brazil)',
    },
    { code: 'ro', name: 'Română', englishName: 'Romanian' },
    { code: 'ru', name: 'Русский', englishName: 'Russian' },
    { code: 'sk', name: 'Slovenčina', englishName: 'Slovak' },
    { code: 'sl', name: 'Slovenščina', englishName: 'Slovenian' },
    { code: 'sr', name: 'Српски', englishName: 'Serbian' },
    { code: 'sv', name: 'Svenska', englishName: 'Swedish' },
    { code: 'th', name: 'ไทย', englishName: 'Thai' },
    { code: 'tr', name: 'Türkçe', englishName: 'Turkish' },
    { code: 'uk', name: 'Українська', englishName: 'Ukrainian' },
    { code: 'ur', name: 'اردو', englishName: 'Urdu' },
    { code: 'vi', name: 'Tiếng Việt', englishName: 'Vietnamese' },
    { code: 'zh', name: '中文 (简体)', englishName: 'Chinese (Simplified)' },
    {
      code: 'zh-tw',
      name: '中文 (繁體)',
      englishName: 'Chinese (Traditional)',
    },
    { code: 'da', name: 'Dansk', englishName: 'Danish' },
    { code: 'et', name: 'Eesti', englishName: 'Estonian' },
    { code: 'ca', name: 'Català', englishName: 'Catalan' },
  ];

  const industries = [
    'E-commerce',
    'Healthcare',
    'Education',
    'Financial Services',
    'Technology',
    'Government',
    'Non-profit',
    'Real Estate',
    'Travel & Hospitality',
    'Media & Entertainment',
    'Professional Services',
    'Other',
  ];

  const handleInputChange =
    (field: keyof StatementFormData) =>
    (event: React.ChangeEvent<HTMLInputElement> | any) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value as string,
      }));

      // Clear translation cache when key settings change
      if (
        field === 'widgetBrandName' ||
        field === 'widgetBrandUrl' ||
        field === 'language'
      ) {
        try {
          // Clear relevant translation caches efficiently
          const keys = Object.keys(localStorage).filter((key) =>
            key.startsWith('translation_'),
          );
          keys.forEach((key) => localStorage.removeItem(key));
        } catch (error) {
          // Handle localStorage quota/access errors gracefully
        }
      }
    };

  const filteredLanguages = languages.filter(
    (lang) =>
      lang.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
      lang.englishName.toLowerCase().includes(languageSearch.toLowerCase()) ||
      lang.code.toLowerCase().includes(languageSearch.toLowerCase()),
  );

  const selectedLanguage = languages.find(
    (lang) => lang.code === formData.language,
  );
  const displayLanguage = selectedLanguage
    ? `${selectedLanguage.name} (${selectedLanguage.englishName})`
    : 'Select Language';

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
    };
  }, []);

  // Debounced statement generation to prevent rapid API calls
  const generateStatementDebounced = useCallback(() => {
    // Clear existing timeout
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current);
    }

    // Set new timeout for debouncing
    translationTimeoutRef.current = setTimeout(async () => {
      // Inline handleGenerateStatement to avoid stale closure
      if (
        !formData.companyName ||
        !formData.websiteUrl ||
        !formData.contactEmail ||
        !formData.industry
      ) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Rate limiting: prevent duplicate requests within 5 seconds
      const now = Date.now();
      const formDataKey = `${formData.companyName}_${formData.websiteUrl}_${formData.contactEmail}_${formData.language}_${formData.industry}`;
      if (
        lastTranslationRef.current &&
        lastTranslationRef.current.formDataKey === formDataKey &&
        now - lastTranslationRef.current.timestamp < 5000
      ) {
        toast.info('Please wait, statement is still being generated...');
        return;
      }

      // Input validation
      if (formData.websiteUrl && !formData.websiteUrl.match(/^https?:\/\/.+/)) {
        toast.error(
          'Please enter a valid website URL starting with http:// or https://',
        );
        return;
      }

      if (
        formData.contactEmail &&
        !formData.contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      ) {
        toast.error('Please enter a valid email address');
        return;
      }

      lastTranslationRef.current = {
        formDataKey,
        timestamp: now,
      };

      setIsGenerating(true);

      try {
        // Generate statement with AI translations
        const statement = await generateStatement(formData);
        setGeneratedStatement(statement);
        toast.success('Accessibility statement generated successfully!');
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to generate statement. Please try again.';
        toast.error(errorMessage);

        // Report errors in production for monitoring
        if (IS_PROD && error instanceof Error) {
          // Log to error monitoring service (e.g., Sentry)
          console.error('Translation error:', {
            message: error.message,
            language: formData.language,
            timestamp: new Date().toISOString(),
          });
        }
      } finally {
        setIsGenerating(false);
      }
    }, 200); // 200ms debounce for faster UX
  }, [formData, setIsGenerating, setGeneratedStatement]);

  // Extract as utility function outside the component
  const getLocalizedDate = (lang: string): string => {
    const localeMap: { [key: string]: string } = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-PT',
      'pt-br': 'pt-BR',
      nl: 'nl-NL',
      pl: 'pl-PL',
      ru: 'ru-RU',
      zh: 'zh-CN',
      'zh-tw': 'zh-TW',
      ja: 'ja-JP',
      ko: 'ko-KR',
      ar: 'ar-SA',
      hi: 'hi-IN',
      th: 'th-TH',
      vi: 'vi-VN',
      tr: 'tr-TR',
      he: 'he-IL',
      sv: 'sv-SE',
      no: 'nb-NO',
      da: 'da-DK',
      fi: 'fi-FI',
      cs: 'cs-CZ',
      sk: 'sk-SK',
      hu: 'hu-HU',
      ro: 'ro-RO',
      bg: 'bg-BG',
      hr: 'hr-HR',
      sr: 'sr-RS',
      sl: 'sl-SI',
      et: 'et-EE',
      lv: 'lv-LV',
      lt: 'lt-LT',
      el: 'el-GR',
      uk: 'uk-UA',
      ms: 'ms-MY',
      id: 'id-ID',
      bn: 'bn-BD',
      ur: 'ur-PK',
      ca: 'ca-ES',
    };
    return localeMap[lang] || 'en-US';
  };

  const generateStatement = async (
    data: StatementFormData,
    enhancement?: string,
  ): Promise<string> => {
    const selectedLanguage = languages.find(
      (lang) => lang.code === data.language,
    );
    const languageName = selectedLanguage ? selectedLanguage.name : 'English';

    const locale = getLocalizedDate(data.language);
    const currentDate = new Date().toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const lastReviewDate = new Date().toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Main translation function (async for API calls)
    const getTranslations = async (lang: string) => {
      if (lang === 'en') {
        return getEnglishTranslations(
          enhancement,
          data.widgetBrandName,
          data.widgetBrandUrl,
        );
      }

      // For non-English languages, try AI translation first
      try {
        const englishTemplate = getEnglishTranslations(
          enhancement,
          data.widgetBrandName,
          data.widgetBrandUrl,
        );
        const languageNames: { [key: string]: string } = {
          ar: 'Arabic',
          bg: 'Bulgarian',
          bn: 'Bengali',
          cs: 'Czech',
          de: 'German',
          el: 'Greek',
          es: 'Spanish',
          fi: 'Finnish',
          fr: 'French',
          he: 'Hebrew',
          hi: 'Hindi',
          hr: 'Croatian',
          hu: 'Hungarian',
          id: 'Indonesian',
          it: 'Italian',
          ja: 'Japanese',
          ko: 'Korean',
          lt: 'Lithuanian',
          lv: 'Latvian',
          ms: 'Malay',
          nl: 'Dutch',
          no: 'Norwegian',
          pl: 'Polish',
          pt: 'Portuguese',
          'pt-br': 'Portuguese (Brazil)',
          ro: 'Romanian',
          ru: 'Russian',
          sk: 'Slovak',
          sl: 'Slovenian',
          sr: 'Serbian',
          sv: 'Swedish',
          th: 'Thai',
          tr: 'Turkish',
          uk: 'Ukrainian',
          ur: 'Urdu',
          vi: 'Vietnamese',
          zh: 'Chinese (Simplified)',
          'zh-tw': 'Chinese (Traditional)',
          da: 'Danish',
          et: 'Estonian',
          ca: 'Catalan',
        };

        const targetLanguageName = languageNames[lang] || 'English';
        const aiTranslations = await callOpenRouterTranslation(
          englishTemplate,
          targetLanguageName,
          lang,
        );

        // Ensure we return an object, not a string
        if (typeof aiTranslations === 'string') {
          try {
            // Clean markdown wrapper if present
            let cleanedTranslations = aiTranslations
              .replace(/^```json\s*/m, '')
              .replace(/\s*```$/m, '')
              .trim();

            return JSON.parse(cleanedTranslations);
          } catch (error) {
            // Fallback to English if translation parsing fails
            return getEnglishTranslations(
              enhancement,
              data.widgetBrandName,
              data.widgetBrandUrl,
            );
          }
        }

        return aiTranslations;
      } catch (error) {
        // Fallback to pre-translated content if available, then English
        const preTranslatedContent = getPreTranslatedContent(lang);
        return (
          preTranslatedContent ||
          getEnglishTranslations(
            enhancement,
            data.widgetBrandName,
            data.widgetBrandUrl,
          )
        );
      }
    };

    const t = await getTranslations(data.language);

    return `# ${t.title} ${data.companyName}

*Last updated: ${currentDate}*

## ${t.general}
${data.companyName} ${t.commitment}

At ${data.companyName}, ${t.belief} ${data.websiteUrl} ${t.accessible}

## ${t.measures}
${data.companyName} ${t.takesComprehensive} ${data.websiteUrl}:

### ${t.orgMeasures}
${t.orgMeasuresList}

### ${t.techMeasures}
${t.techMeasuresList}

## ${t.conformance}
${t.wcagDescription}

**${data.websiteUrl} ${t.fullyConformant}**

${t.complianceList}

## ${t.technical}
${data.websiteUrl} ${t.techIntro}

${t.techList}

${t.techNote}

## ${t.assessment}
${data.companyName} ${t.assessmentIntro} ${data.websiteUrl} ${t.assessmentBy}

### ${t.automatedTesting}
${t.automatedList}

### ${t.manualTesting}
${t.manualList}

### ${t.userTesting}
${t.userList}

## ${t.widget}
${t.widgetIntro}

### ${t.profiles}
${t.profilesIntro}

${t.profilesList}

### ${t.features}
${t.featuresIntro}

${t.featuresList}

## ${t.feedback}
${t.feedbackIntro} ${data.websiteUrl}. ${t.feedbackNote}

**${t.contactInfo}**
${(() => {
  const contactItems = [];
  if (data.phoneNumber) contactItems.push(`- **Phone:** ${data.phoneNumber}`);
  contactItems.push(`- **E-mail:** ${data.contactEmail}`);
  if (data.onlineFormUrl)
    contactItems.push(
      `- **Online Form:** [Link to accessibility feedback form](${data.onlineFormUrl})`,
    );
  if (data.visitorAddress)
    contactItems.push(`- **Visitor Address:** ${data.visitorAddress}`);
  if (data.postalAddress)
    contactItems.push(`- **Postal Address:** ${data.postalAddress}`);
  return contactItems.join('\n');
})()}

**Response Time:** ${t.responseTime}

## ${t.compatibility}
${data.websiteUrl} ${t.compatibilityIntro}

### ${t.screenReaders}
${t.screenReadersList}

### ${t.browsers}
${t.browsersList}

### ${t.otherAssistive}
${t.otherAssistiveList}

## ${t.limitations}
${t.limitationsIntro} ${data.websiteUrl}, ${t.limitationsText}

**${t.knownLimitations} ${data.websiteUrl}:**

1. ${t.limitation1}

2. ${t.limitation2}

3. ${t.limitation3}

**${t.whatWereDoing}**
${t.whatWeDoList}

## ${t.compliance}
${
  data.widgetBrandName && data.widgetBrandName !== 'WebAbility.io'
    ? `${t.statementGenerated} ${currentDate} using professional accessibility assessment tools. ${t.lastReviewed} ${lastReviewDate}.`
    : `${t.statementGenerated} ${currentDate} using [${
        data.widgetBrandName || 'WebAbility.io'
      }'s ${
        t.aiGenerator
      }](https://app.webability.io/statement-generator) and manual accessibility assessment tools. ${
        t.lastReviewed
      } ${lastReviewDate}.`
}

**${t.complianceStatus}**
- WCAG 2.1 AA: ✅ Fully Compliant
- Section 508: ✅ Compliant
- ADA Title III: ✅ Compliant
- EN 301 549: ✅ Compliant

## ${t.approval}
${t.approvedBy}

**${data.companyName}**  
**${t.accessibilityOfficer}**  
**Email:** ${data.contactEmail}  
**Date:** ${currentDate}

---

### ${t.aboutStatement}

${
  data.widgetBrandName && data.widgetBrandName !== 'WebAbility.io'
    ? `*${t.statementGenerated} ${currentDate}. This statement reflects our current accessibility features and our ongoing commitment to digital inclusion.*`
    : `*${t.statementGenerated} [${
        data.widgetBrandName || 'WebAbility.io'
      }'s Professional ${
        t.aiGenerator
      }](https://app.webability.io/statement-generator) ${currentDate}. This statement reflects our current accessibility features and our ongoing commitment to digital inclusion.*`
}

**${t.statementDetails}**
- **Language:** ${languageName} (${data.language.toUpperCase()})
- **Industry:** ${data.industry || 'General Business'}
- **${t.complianceLevel}** WCAG 2.1 AA
- **${t.nextReviewDate}** ${new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}

${
  data.widgetBrandName && data.widgetBrandName !== 'WebAbility.io'
    ? `**${t.poweredBy} [${data.widgetBrandName}](${
        data.widgetBrandUrl || data.websiteUrl
      }) - ${t.makingWebAccessible}**`
    : `**${t.poweredBy} [${data.widgetBrandName || 'WebAbility.io'}](${
        data.widgetBrandUrl || 'https://webability.io'
      }) - ${t.makingWebAccessible}**`
}`;
  };

  const convertToFormat = (
    content: string,
    format: 'markdown' | 'html' | 'text',
  ): string => {
    switch (format) {
      case 'html':
        // Split content into lines for better processing
        const lines = content.split('\n');
        const processedLines: string[] = [];
        let inList = false;
        let listItems: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmedLine = line.trim();

          // Handle headers
          if (trimmedLine.startsWith('### ')) {
            // Close any open list
            if (inList) {
              processedLines.push(
                `<ul style="margin: 1rem 0; padding-left: 1.5rem;">${listItems.join(
                  '',
                )}</ul>`,
              );
              listItems = [];
              inList = false;
            }
            processedLines.push(
              `<h3 style="color: #4b5563; font-size: 1.25rem; font-weight: 600; margin: 1rem 0;">${trimmedLine.substring(
                4,
              )}</h3>`,
            );
          } else if (trimmedLine.startsWith('## ')) {
            // Close any open list
            if (inList) {
              processedLines.push(
                `<ul style="margin: 1rem 0; padding-left: 1.5rem;">${listItems.join(
                  '',
                )}</ul>`,
              );
              listItems = [];
              inList = false;
            }
            processedLines.push(
              `<h2 style="color: #374151; font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0;">${trimmedLine.substring(
                3,
              )}</h2>`,
            );
          } else if (trimmedLine.startsWith('# ')) {
            // Close any open list
            if (inList) {
              processedLines.push(
                `<ul style="margin: 1rem 0; padding-left: 1.5rem;">${listItems.join(
                  '',
                )}</ul>`,
              );
              listItems = [];
              inList = false;
            }
            processedLines.push(
              `<h1 style="color: #1f2937; font-size: 2rem; font-weight: bold; margin: 1.5rem 0;">${trimmedLine.substring(
                2,
              )}</h1>`,
            );
          }
          // Handle list items
          else if (trimmedLine.startsWith('- ')) {
            if (!inList) {
              inList = true;
            }
            const listContent = trimmedLine
              .substring(2)
              .replace(
                /\*\*(.*?)\*\*/g,
                '<strong style="font-weight: 600;">$1</strong>',
              )
              .replace(
                /\[([^\]]+)\]\(([^)]+)\)/g,
                '<a href="$2" style="color: #0033ed; text-decoration: underline;">$1</a>',
              );
            listItems.push(`<li style="margin: 0.5rem 0;">${listContent}</li>`);
          }
          // Handle horizontal rule
          else if (trimmedLine === '---') {
            // Close any open list
            if (inList) {
              processedLines.push(
                `<ul style="margin: 1rem 0; padding-left: 1.5rem;">${listItems.join(
                  '',
                )}</ul>`,
              );
              listItems = [];
              inList = false;
            }
            processedLines.push(
              '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0;">',
            );
          }
          // Handle empty lines
          else if (trimmedLine === '') {
            // Close any open list
            if (inList) {
              processedLines.push(
                `<ul style="margin: 1rem 0; padding-left: 1.5rem;">${listItems.join(
                  '',
                )}</ul>`,
              );
              listItems = [];
              inList = false;
            }
            // Don't add empty paragraphs
          }
          // Handle regular content
          else {
            // Close any open list
            if (inList) {
              processedLines.push(
                `<ul style="margin: 1rem 0; padding-left: 1.5rem;">${listItems.join(
                  '',
                )}</ul>`,
              );
              listItems = [];
              inList = false;
            }

            // Process the line content
            let processedLine = trimmedLine
              .replace(
                /\*\*(.*?)\*\*/g,
                '<strong style="font-weight: 600;">$1</strong>',
              )
              .replace(
                /\[([^\]]+)\]\(([^)]+)\)/g,
                '<a href="$2" style="color: #0033ed; text-decoration: underline;">$1</a>',
              )
              .replace(/\*(.*?)\*/g, '<em>$1</em>');

            // Only wrap in paragraph if it's not already wrapped
            if (!processedLine.startsWith('<')) {
              processedLines.push(
                `<p style="margin: 1rem 0; line-height: 1.6; color: #374151;">${processedLine}</p>`,
              );
            } else {
              processedLines.push(processedLine);
            }
          }
        }

        // Close any remaining list
        if (inList) {
          processedLines.push(
            `<ul style="margin: 1rem 0; padding-left: 1.5rem;">${listItems.join(
              '',
            )}</ul>`,
          );
        }

        const htmlContent = processedLines.join('\n');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Accessibility Statement</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #374151;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background-color: #ffffff;
        }
        h1 { color: #1f2937; font-size: 2rem; font-weight: bold; margin: 1.5rem 0; }
        h2 { color: #374151; font-size: 1.5rem; font-weight: 600; margin: 1.25rem 0; }
        h3 { color: #4b5563; font-size: 1.25rem; font-weight: 600; margin: 1rem 0; }
        p { margin: 1rem 0; line-height: 1.6; }
        ul { margin: 1rem 0; padding-left: 1.5rem; }
        li { margin: 0.5rem 0; }
        strong { font-weight: 600; }
        hr { border: none; border-top: 1px solid #e5e7eb; margin: 2rem 0; }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
      case 'text':
        return content
          .replace(/^# /gm, '')
          .replace(/^## /gm, '')
          .replace(/^### /gm, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/---/g, '────────────────────────────────────')
          .replace(/`([^`]+)`/g, '$1');
      default:
        return content;
    }
  };

  const getFormattedContent = (): string => {
    return convertToFormat(generatedStatement, selectedFormat);
  };

  const copyToClipboard = async () => {
    try {
      const content = getFormattedContent();

      // Check if content is empty
      if (!content || content.trim() === '') {
        toast.error('No content to copy. Please generate a statement first.');
        return;
      }

      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
        toast.success(`Statement copied as ${selectedFormat.toUpperCase()}!`);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (successful) {
            toast.success(
              `Statement copied as ${selectedFormat.toUpperCase()}!`,
            );
          } else {
            throw new Error('Copy command failed');
          }
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('Copy to clipboard error:', error);
      toast.error(
        'Failed to copy to clipboard. Please try selecting and copying manually.',
      );
    }
  };

  const downloadStatement = () => {
    const content = getFormattedContent();
    const extensions = { markdown: 'md', html: 'html', text: 'txt' };
    const mimeTypes = {
      markdown: 'text/markdown',
      html: 'text/html',
      text: 'text/plain',
    };

    const blob = new Blob([content], { type: mimeTypes[selectedFormat] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.companyName || 'accessibility'}-statement.${
      extensions[selectedFormat]
    }`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Statement downloaded as ${selectedFormat.toUpperCase()}!`);
  };

  // Toggle enhancement selection and apply immediately
  const toggleEnhancement = async (enhancement: string) => {
    const isCurrentlySelected = selectedEnhancements.includes(enhancement);

    if (isCurrentlySelected) {
      // Remove enhancement
      setSelectedEnhancements((prev) =>
        prev.filter((item) => item !== enhancement),
      );
      // You could regenerate without this enhancement here if needed
    } else {
      // Add enhancement and apply immediately
      const newSelectedEnhancements = [...selectedEnhancements, enhancement];
      setSelectedEnhancements(newSelectedEnhancements);

      // Apply the enhancement immediately
      await applySpecificEnhancement(enhancement);
    }
  };

  // Apply a specific enhancement immediately
  const applySpecificEnhancement = async (enhancement: string) => {
    if (!generatedStatement) {
      toast.error('Please generate a statement first');
      return;
    }

    setIsGenerating(true);
    toast.info('Applying enhancement...');

    try {
      // Create enhanced form data with the specific enhancement
      const enhancedFormData = { ...formData };

      switch (enhancement) {
        case 'add-testing':
          enhancedFormData.industry =
            formData.industry + ' (with detailed testing procedures)';
          break;
        case 'add-timeline':
          enhancedFormData.industry =
            formData.industry + ' (with response timelines)';
          break;
        case 'add-training':
          enhancedFormData.industry =
            formData.industry + ' (with staff training details)';
          break;
        case 'add-standards':
          enhancedFormData.industry =
            formData.industry + ' (with additional standards)';
          break;
      }

      // Regenerate the statement with the enhancement
      const enhancedStatement = await generateStatement(
        enhancedFormData,
        enhancement,
      );
      setGeneratedStatement(enhancedStatement);

      const enhancementNames = {
        'add-testing': 'automated testing procedures',
        'add-timeline': 'response timelines',
        'add-training': 'staff training information',
        'add-standards': 'additional compliance standards',
      };

      toast.success(
        `Enhancement applied: ${
          enhancementNames[enhancement as keyof typeof enhancementNames]
        }!`,
      );
    } catch (error) {
      console.error('Enhancement error:', error);
      toast.error('Failed to apply enhancement. Please try again.');
      // Remove the enhancement from selection if it failed
      setSelectedEnhancements((prev) =>
        prev.filter((item) => item !== enhancement),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Apply selected enhancements
  const applyEnhancements = async () => {
    if (selectedEnhancements.length === 0) {
      toast.error('Please select at least one enhancement');
      return;
    }

    if (!generatedStatement) {
      toast.error('Please generate a statement first');
      return;
    }

    setIsGenerating(true);
    toast.info('Applying enhancements to statement...');

    try {
      // Create enhanced form data with all selected enhancements
      const enhancedFormData = { ...formData };

      // Apply all selected enhancements
      let enhancementSuffix = '';
      selectedEnhancements.forEach((enhancement) => {
        switch (enhancement) {
          case 'add-testing':
            enhancementSuffix += ' (with detailed testing procedures)';
            break;
          case 'add-timeline':
            enhancementSuffix += ' (with response timelines)';
            break;
          case 'add-training':
            enhancementSuffix += ' (with staff training details)';
            break;
          case 'add-standards':
            enhancementSuffix += ' (with additional standards)';
            break;
        }
      });

      enhancedFormData.industry = formData.industry + enhancementSuffix;

      // Regenerate the statement with all enhancements
      const enhancedStatement = await generateStatement(
        enhancedFormData,
        selectedEnhancements.join(','),
      );
      setGeneratedStatement(enhancedStatement);

      toast.success(
        `Statement enhanced with ${selectedEnhancements.length} improvements!`,
      );
      setShowEnhancePage(false);
      setSelectedEnhancements([]);
    } catch (error) {
      console.error('Enhancement error:', error);
      toast.error('Failed to enhance statement. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // AI enhancement function that regenerates the statement with additional features
  const enhanceStatement = async (enhancement: string) => {
    if (!generatedStatement) {
      toast.error('Please generate a statement first');
      return;
    }

    setIsGenerating(true);
    toast.info('Regenerating statement with AI enhancements...');

    try {
      // Create enhanced form data with additional requirements
      const enhancedFormData = { ...formData };

      switch (enhancement) {
        case 'add-testing':
          enhancedFormData.industry =
            formData.industry + ' (with detailed testing procedures)';
          break;
        case 'add-timeline':
          enhancedFormData.industry =
            formData.industry + ' (with response timelines)';
          break;
        case 'add-training':
          enhancedFormData.industry =
            formData.industry + ' (with staff training details)';
          break;
        case 'add-standards':
          enhancedFormData.industry =
            formData.industry + ' (with additional standards)';
          break;
        default:
          toast.error('Unknown enhancement option');
          setIsGenerating(false);
          return;
      }

      // Regenerate the statement with enhancements
      const enhancedStatement = await generateStatement(
        enhancedFormData,
        enhancement,
      );
      setGeneratedStatement(enhancedStatement);

      const enhancementNames = {
        'add-testing': 'automated testing procedures',
        'add-timeline': 'response timelines',
        'add-training': 'staff training information',
        'add-standards': 'additional compliance standards',
      };

      toast.success(
        `Statement enhanced with ${
          enhancementNames[enhancement as keyof typeof enhancementNames]
        }!`,
      );
    } catch (error) {
      console.error('Enhancement error:', error);
      toast.error('Failed to enhance statement. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="statement-generator-wrapper min-h-screen">
      <style>{`
        /* Custom scrollbar styling to match Figma design */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #7383ED;
          border-radius: 3px;
          border: none;
          min-height: 20px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #5a6bdb;
        }
        
        .custom-scrollbar::-webkit-scrollbar-corner {
          background: transparent;
        }
        
        /* For Firefox */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #7383ED transparent;
        }
      `}</style>
      <div className="pl-6">
        <header className="text-left mb-1">
          <div className="mb-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-1">
              AI Accessibility Statement Generator
            </h1>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Generated Statement Section */}
          <div className=" statement-preview-section w-full lg:col-span-2">
            <div className="pt-2 w-full">
              {generatedStatement ? (
                <div>
                  {/* Format Selection */}
                  <div className="mb-6">
                    <div className="flex flex-row sm:flex-col bg-gray-50 border border-[#A2ADF3] rounded-lg p-1">
                      <button
                        onClick={() => setSelectedFormat('markdown')}
                        className={`flex-1 px-4 py-3 rounded-md font-medium text-sm transition-all ${
                          selectedFormat === 'markdown'
                            ? 'bg-[#445AE7] text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <FaFileAlt className="inline mr-2" size={14} />
                        Markdown
                      </button>
                      <button
                        onClick={() => setSelectedFormat('html')}
                        className={`flex-1 px-4 py-3 rounded-md font-medium text-sm transition-all ${
                          selectedFormat === 'html'
                            ? 'bg-[#445AE7] text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <FaCode className="inline mr-2" size={14} />
                        HTML
                      </button>
                      <button
                        onClick={() => setSelectedFormat('text')}
                        className={`flex-1 px-4 py-3 rounded-md font-medium text-sm transition-all ${
                          selectedFormat === 'text'
                            ? 'bg-[#445AE7] text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <MdTextFields className="inline mr-2" size={14} />
                        Plain Text
                      </button>
                    </div>
                  </div>

                  <div
                    className="bg-[#edf2fd] p-6 pr-4 rounded-2xl max-h-[600px] overflow-y-auto mb-6 border border-[#A2ADF3] custom-scrollbar"
                    style={{
                      fontFamily:
                        selectedFormat === 'html' ? 'inherit' : 'monospace',
                      fontSize:
                        selectedFormat === 'html' ? '0.9rem' : '0.875rem',
                    }}
                  >
                    {selectedFormat === 'html' ? (
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: getFormattedContent()
                            .replace(/^<!DOCTYPE html>[\s\S]*<body>/, '')
                            .replace(/<\/body>[\s\S]*<\/html>$/, ''),
                        }}
                        style={{
                          fontFamily:
                            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                          lineHeight: '1.6',
                          color: '#374151',
                        }}
                      />
                    ) : (
                      <pre
                        className="whitespace-pre-wrap text-gray-800"
                        style={{ margin: 0 }}
                      >
                        {getFormattedContent()}
                      </pre>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 mb-4 justify-end">
                    <Button
                      variant="outlined"
                      onClick={copyToClipboard}
                      startIcon={<HiClipboardCopy />}
                      sx={{
                        py: 1.5,
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: '600',
                        borderColor: '#0033ed',
                        color: '#0033ed',
                        '&:hover': {
                          backgroundColor: '#f8faff',
                          borderColor: '#0029c7',
                        },
                      }}
                    >
                      Copy {selectedFormat.toUpperCase()}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={downloadStatement}
                      startIcon={<HiDownload />}
                      sx={{
                        py: 1.5,
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: '600',
                        backgroundColor: '#0033ed',
                        '&:hover': {
                          backgroundColor: '#0029c7',
                        },
                      }}
                    >
                      Download {selectedFormat.toUpperCase()}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[600px] bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 rounded-2xl border border-[#A2ADF3] p-8">
                  <div className="relative mb-6">
                    <img
                      src={noReportFoundImage}
                      alt="No statement generated"
                      className="w-24 h-30 mx-auto drop-shadow-sm"
                    />
                  </div>
                  <div className="text-center max-w-md">
                    <h3 className="text-lg font-medium text-gray-700 mb-2 leading-relaxed">
                      Your statement will be shown here after generated
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Fill in the form and click "Generate AI Statement" to
                      create your accessibility statement
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 h-fit company-form-section lg:max-w-lg max-h-[800px] overflow-y-auto custom-scrollbar">
            <div className="p-8">
              {showEnhancePage ? (
                /* Enhance Statement Content */
                <>
                  {/* Header */}
                  <div className="flex items-center mb-6">
                    <button
                      onClick={() => setShowEnhancePage(false)}
                      className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Enhance Statement
                    </h2>
                  </div>

                  {/* Instruction */}
                  <p className="text-gray-600 mb-6">
                    Select one or more enhancement
                  </p>

                  {/* Enhancement Options */}
                  <div className="space-y-4 mb-8">
                    <button
                      onClick={() => toggleEnhancement('add-testing')}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                        selectedEnhancements.includes('add-testing')
                          ? 'border-[#445AE7] bg-[#445AE7] text-white'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium mb-1">
                        Add testing details
                      </div>
                      <div className="text-sm opacity-80">
                        Include automated testing tools and procedures
                      </div>
                    </button>

                    <button
                      onClick={() => toggleEnhancement('add-timeline')}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                        selectedEnhancements.includes('add-timeline')
                          ? 'border-[#445AE7] bg-[#445AE7] text-white'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium mb-1">Add Response Time</div>
                      <div className="text-sm opacity-80">
                        Include specific response times for feedback
                      </div>
                    </button>

                    <button
                      onClick={() => toggleEnhancement('add-training')}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                        selectedEnhancements.includes('add-training')
                          ? 'border-[#445AE7] bg-[#445AE7] text-white'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium mb-1">Add Staff Training</div>
                      <div className="text-sm opacity-80">
                        Include information about accessibility training
                      </div>
                    </button>

                    <button
                      onClick={() => toggleEnhancement('add-standards')}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                        selectedEnhancements.includes('add-standards')
                          ? 'border-[#445AE7] bg-[#445AE7] text-white'
                          : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium mb-1">Add More Standards</div>
                      <div className="text-sm opacity-80">
                        Include EN 301 549 and Section 508 compliance
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                /* Normal Form Content */
                <>
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Company Information
                    </h2>
                    <p className="text-gray-600">
                      Fill in your details to generate a customized
                      accessibility statement
                    </p>
                  </div>

                  <div className="space-y-4">
                    <TextField
                      fullWidth
                      label="Company Name *"
                      value={formData.companyName}
                      onChange={handleInputChange('companyName')}
                      placeholder="Enter your company name"
                      variant="outlined"
                      inputProps={{
                        onPaste: (e) => {
                          // Explicitly allow paste
                          e.stopPropagation();
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Website URL *"
                      value={formData.websiteUrl}
                      onChange={handleInputChange('websiteUrl')}
                      placeholder="https://example.com"
                      variant="outlined"
                      inputProps={{
                        onPaste: (e) => {
                          // Explicitly allow paste
                          e.stopPropagation();
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Contact Email *"
                      value={formData.contactEmail}
                      onChange={handleInputChange('contactEmail')}
                      placeholder="accessibility@example.com"
                      variant="outlined"
                      inputProps={{
                        onPaste: (e) => {
                          // Explicitly allow paste
                          e.stopPropagation();
                        },
                      }}
                    />

                    <FormControl fullWidth>
                      <InputLabel>Industry *</InputLabel>
                      <Select
                        value={formData.industry}
                        onChange={handleInputChange('industry')}
                        label="Industry *"
                      >
                        {industries.map((industry) => (
                          <MenuItem key={industry} value={industry}>
                            {industry}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Custom Language Selector */}
                    <div className="relative language-dropdown-section">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setIsLanguageDropdownOpen(!isLanguageDropdownOpen)
                          }
                          className="w-full px-3 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          <span className="block truncate">
                            {displayLanguage}
                          </span>
                          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg
                              className="h-5 w-5 text-gray-400"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        </button>

                        {isLanguageDropdownOpen && (
                          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg border border-gray-300 rounded-lg">
                            <div className="p-3 border-b border-gray-200">
                              <input
                                type="text"
                                placeholder="Search languages..."
                                value={languageSearch}
                                onChange={(e) =>
                                  setLanguageSearch(e.target.value)
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                              />
                            </div>
                            <div className="max-h-60 overflow-auto custom-scrollbar">
                              {filteredLanguages.map((lang) => (
                                <button
                                  key={lang.code}
                                  type="button"
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      language: lang.code,
                                    }));
                                    setIsLanguageDropdownOpen(false);
                                    setLanguageSearch('');
                                  }}
                                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                                    formData.language === lang.code
                                      ? 'bg-primary/10 text-primary font-medium'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <span>
                                      {lang.name} ({lang.englishName})
                                    </span>
                                    {formData.language === lang.code && (
                                      <svg
                                        className="h-4 w-4 text-primary"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    )}
                                  </div>
                                </button>
                              ))}
                              {filteredLanguages.length === 0 && (
                                <div className="px-3 py-2 text-gray-500 text-sm">
                                  No languages found
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Divider for optional fields */}
                    <div className="my-6 border-t border-gray-200 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Optional Information
                        </h3>
                        <button
                          type="button"
                          onClick={() =>
                            setShowOptionalFields(!showOptionalFields)
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                            showOptionalFields ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                          aria-label="Toggle optional fields"
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                              showOptionalFields
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {showOptionalFields && (
                        <>
                          {/* Brand Customization */}
                          <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-3">
                              Customize widget branding (leave empty to use
                              WebAbility.io)
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <TextField
                                fullWidth
                                label="Widget Brand Name"
                                value={formData.widgetBrandName}
                                onChange={handleInputChange('widgetBrandName')}
                                placeholder="WebAbility.io"
                                variant="outlined"
                                size="small"
                              />
                              <TextField
                                fullWidth
                                label="Widget Brand URL"
                                value={formData.widgetBrandUrl}
                                onChange={handleInputChange('widgetBrandUrl')}
                                placeholder="https://webability.io"
                                variant="outlined"
                                size="small"
                              />
                            </div>
                          </div>

                          {/* Contact Information */}
                          <div>
                            <p className="text-sm text-gray-600 mb-3">
                              Additional contact information (fields left empty
                              will not appear in the statement)
                            </p>
                            <div className="space-y-4">
                              <TextField
                                fullWidth
                                label="Phone Number"
                                value={formData.phoneNumber}
                                onChange={handleInputChange('phoneNumber')}
                                placeholder="+1 (555) 123-4567"
                                variant="outlined"
                                size="small"
                              />
                              <TextField
                                fullWidth
                                label="Online Form URL"
                                value={formData.onlineFormUrl}
                                onChange={handleInputChange('onlineFormUrl')}
                                placeholder="https://example.com/accessibility-feedback"
                                variant="outlined"
                                size="small"
                              />
                              <TextField
                                fullWidth
                                label="Visitor Address"
                                value={formData.visitorAddress}
                                onChange={handleInputChange('visitorAddress')}
                                placeholder="123 Main St, Suite 100, City, State 12345"
                                variant="outlined"
                                size="small"
                              />
                              <TextField
                                fullWidth
                                label="Postal Address"
                                value={formData.postalAddress}
                                onChange={handleInputChange('postalAddress')}
                                placeholder="P.O. Box 123, City, State 12345"
                                variant="outlined"
                                size="small"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="generate-button-section">
                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={generateStatementDebounced}
                      disabled={isGenerating}
                      startIcon={
                        isGenerating ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <MdOutlineGavel />
                        )
                      }
                      sx={{
                        mt: 4,
                        py: 2,
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        background:
                          'linear-gradient(180deg, #445AE7 0%, #11163A 100%)',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(68, 90, 231, 0.25)',
                        border: 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '1px',
                          background:
                            'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                        },
                        '&:hover': {
                          background:
                            'linear-gradient(180deg, #3d4fd1 0%, #0f1233 100%)',
                          boxShadow: '0 6px 16px rgba(68, 90, 231, 0.3)',
                          transform: 'translateY(-1px)',
                        },
                        '&:active': {
                          transform: 'translateY(0)',
                          boxShadow: '0 2px 8px rgba(68, 90, 231, 0.2)',
                        },
                        '&:disabled': {
                          background: '#9ca3af',
                          transform: 'none',
                          boxShadow: 'none',
                        },
                      }}
                    >
                      {isGenerating ? 'Generating...' : 'Generate'}
                    </Button>

                    {generatedStatement && (
                      <Button
                        fullWidth
                        variant="text"
                        size="medium"
                        onClick={() => setShowEnhancePage(true)}
                        sx={{
                          mt: 2,
                          py: 1.5,
                          textTransform: 'none',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          color: '#0033ed',
                          '&:hover': {
                            backgroundColor: '#f8faff',
                          },
                        }}
                      >
                        Enhance Statement
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <TourGuide
        steps={statementGeneratorTourSteps}
        tourKey={tourKeys.statementGenerator}
        customStyles={defaultTourStyles}
      />
    </div>
  );
};

export default StatementGenerator;
