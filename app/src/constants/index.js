export const JWT_STORAGE_KEY = 'saasgear';

export const APP_SUMO_BUNDLE_NAME='app sumo bundle'
// Test mode bundle name = app sumo bundle test

// export const APP_SUMO_BUNDLE_NAMES=['app sumo tier small','app sumo tier medium','app sumo tier large'] //test mode

export const APP_SUMO_BUNDLE_NAMES=['app sumo small','app sumo medium','app sumo large'] // prod

export const SITE_SELECTOR_TEXT = 'Select a Domain'

export const plans = [
    {
      id: process.env.REACT_APP_PLAN_NAME || 'single',
      name: 'WebAbility Pro',
      price: 12,
      desc: 'Ideal for all your accessibility needs for a single site',
      features: [
        'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
        'Accessbility Statement',
        'AI powered Screen Reader and Accessbility Profiles',
        'Web Ability accesbility Statement',
      ]
    },
    // {
    //   id: 'small tier',
    //   name: 'Small Business',
    //   price: 30,
    //   desc: '',
    //   features: [
    //     'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
    //     'Accessbility Statement',
    //     'AI powered Screen Reader and Accessbility Profiles',
    //     'Web Ability accesbility Statement',
    //   ]
    // },
    // {
    //   id: 'medium tier',
    //   name: 'Medium Business',
    //   price: 70,
    //   desc: '',
    //   features: [
    //     'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
    //     'Accessbility Statement',
    //     'AI powered Screen Reader and Accessbility Profiles',
    //     'Web Ability accesbility Statement',
    //   ]
    // },
    // {
    //   id: 'large tier',
    //   name: 'Enterprise',
    //   price: 100,
    //   desc: '',
    //   features: [
    //     'Compliance with ADA, WCAG 2.1, Section 508, AODA, EN 301 549, and IS 5568',
    //     'Accessbility Statement',
    //     'AI powered Screen Reader and Accessbility Profiles',
    //     'Web Ability accesbility Statement',
    //   ]
    // },
];