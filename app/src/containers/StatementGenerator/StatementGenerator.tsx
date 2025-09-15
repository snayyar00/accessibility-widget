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
import { toast } from 'react-toastify';
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
      await navigator.clipboard.writeText(content);
      toast.success(`Statement copied as ${selectedFormat.toUpperCase()}!`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
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
    <div className="statement-generator-wrapper min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="text-center mb-16">
          <div className="mb-6">
            <div className="bg-primary p-4 rounded-2xl w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-sm">
              <FaFileAlt className="text-white" size={36} />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              AI Accessibility Statement Generator
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              AI-Powered • WCAG 2.1 AA Compliant • 42+ Languages • Ready to
              Deploy
            </p>
          </div>
          <p className="text-xl text-gray-700 max-w-4xl mx-auto leading-relaxed font-medium">
            Generate industry-standard accessibility statements that comply with
            WCAG 2.1 AA guidelines in 42+ languages using our advanced AI
            engine. Perfect for legal compliance and demonstrating your
            commitment to digital accessibility.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 h-fit company-form-section">
            <div className="p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Company Information
                </h2>
                <p className="text-gray-600">
                  Fill in your details to generate a customized accessibility
                  statement
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
                      <span className="block truncate">{displayLanguage}</span>
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
                            onChange={(e) => setLanguageSearch(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm"
                          />
                        </div>
                        <div className="max-h-60 overflow-auto">
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
                      onClick={() => setShowOptionalFields(!showOptionalFields)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        showOptionalFields ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                      aria-label="Toggle optional fields"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                          showOptionalFields ? 'translate-x-6' : 'translate-x-1'
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
                          Additional contact information (fields left empty will
                          not appear in the statement)
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
                    borderRadius: '16px',
                    textTransform: 'none',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    backgroundColor: '#0033ed',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(0, 51, 237, 0.25)',
                    '&:hover': {
                      backgroundColor: '#0029c7',
                      boxShadow: '0 6px 16px rgba(0, 51, 237, 0.3)',
                    },
                    '&:disabled': {
                      backgroundColor: '#9ca3af',
                    },
                  }}
                >
                  {isGenerating
                    ? 'Generating Professional Statement...'
                    : 'Generate AI Statement'}
                </Button>
              </div>
            </div>
          </div>

          {/* Generated Statement Section */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-200 h-fit statement-preview-section">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Generated Statement
                  </h2>
                  <p className="text-gray-600">
                    Your professional accessibility statement will appear here
                  </p>
                </div>
                {generatedStatement && (
                  <Chip
                    label="✓ Ready"
                    sx={{
                      backgroundColor: '#10b981',
                      color: 'white',
                      fontWeight: '600',
                      px: 2,
                      py: 1,
                    }}
                  />
                )}
              </div>

              {generatedStatement ? (
                <div>
                  {/* Format Selection */}
                  <div className="mb-6">
                    <p className="mb-3 font-semibold text-gray-900">
                      Export Format:
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setSelectedFormat('markdown')}
                        className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                          selectedFormat === 'markdown'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <FaFileAlt className="inline mr-2" size={14} />
                        Markdown
                      </button>
                      <button
                        onClick={() => setSelectedFormat('html')}
                        className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                          selectedFormat === 'html'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <FaCode className="inline mr-2" size={14} />
                        HTML
                      </button>
                      <button
                        onClick={() => setSelectedFormat('text')}
                        className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                          selectedFormat === 'text'
                            ? 'bg-primary text-white shadow-md'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <MdTextFields className="inline mr-2" size={14} />
                        Plain Text
                      </button>
                    </div>
                  </div>

                  <div
                    className="bg-gray-50 p-6 rounded-2xl max-h-96 overflow-y-auto mb-6 border border-gray-200"
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

                  <div className="grid grid-cols-2 gap-4 mb-4">
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

                  {/* AI Enhancement Section */}
                  <div className="border-t border-gray-200 pt-6 mt-6 ai-helper-section">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-lg mr-3">
                          <MdOutlineGavel className="text-blue-700" size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">
                            AI Enhancements
                          </h3>
                          <p className="text-sm text-gray-600">
                            Improve your statement with one-click additions
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() =>
                          setShowEnhanceOptions(!showEnhanceOptions)
                        }
                        sx={{
                          borderRadius: '8px',
                          textTransform: 'none',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          borderColor: '#d1d5db',
                          color: '#374151',
                          '&:hover': {
                            backgroundColor: '#f9fafb',
                            borderColor: '#9ca3af',
                          },
                        }}
                      >
                        {showEnhanceOptions
                          ? 'Hide Options'
                          : 'Enhance Statement'}
                      </Button>
                    </div>

                    {showEnhanceOptions && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                          onClick={() => enhanceStatement('add-testing')}
                          className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="font-medium text-gray-900 mb-1">
                            Add Testing Details
                          </div>
                          <div className="text-sm text-gray-600">
                            Include automated testing tools and procedures
                          </div>
                        </button>
                        <button
                          onClick={() => enhanceStatement('add-timeline')}
                          className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="font-medium text-gray-900 mb-1">
                            Add Response Timeline
                          </div>
                          <div className="text-sm text-gray-600">
                            Include specific response times for feedback
                          </div>
                        </button>
                        <button
                          onClick={() => enhanceStatement('add-training')}
                          className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="font-medium text-gray-900 mb-1">
                            Add Staff Training
                          </div>
                          <div className="text-sm text-gray-600">
                            Include information about accessibility training
                          </div>
                        </button>
                        <button
                          onClick={() => enhanceStatement('add-standards')}
                          className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="font-medium text-gray-900 mb-1">
                            Add More Standards
                          </div>
                          <div className="text-sm text-gray-600">
                            Include EN 301 549 and Section 508 compliance
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FaFileAlt size={64} className="mx-auto mb-4 text-gray-300" />
                  <p className="mb-2 text-base">
                    Fill in the form and click "Generate AI Statement"
                  </p>
                  <p className="text-gray-400 text-sm">
                    Create professional accessibility statements in multiple
                    formats
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 features-section">
          <div className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                AI Statement Features
              </h2>
              <p className="text-gray-600 text-base">
                Industry-standard, legally compliant, and ready-to-deploy
                accessibility statements
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-500 p-4 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-md">
                  <FaFileAlt className="text-white" size={24} />
                </div>
                <h3 className="font-bold text-lg mb-3 text-gray-900">
                  WCAG 2.1 AA Compliant
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Professional statements following WCAG 2.1 AA guidelines with
                  industry-standard language and comprehensive coverage for
                  legal compliance
                </p>
              </div>
              <div className="text-center">
                <div className="bg-green-500 p-4 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-md">
                  <MdCode className="text-white" size={28} />
                </div>
                <h3 className="font-bold text-lg mb-3 text-gray-900">
                  42+ Languages
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Generate statements in 42+ languages including Arabic,
                  Chinese, Spanish, French, and more for global accessibility
                  compliance
                </p>
              </div>
              <div className="text-center">
                <div className="bg-gray-500 p-4 rounded-xl w-16 h-16 mx-auto mb-4 flex items-center justify-center shadow-md">
                  <HiDownload className="text-white" size={24} />
                </div>
                <h3 className="font-bold text-lg mb-3 text-gray-900">
                  Multiple Formats
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Download as Markdown, HTML, or Plain Text - statements are
                  ready for immediate deployment on your website or
                  documentation
                </p>
              </div>
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
