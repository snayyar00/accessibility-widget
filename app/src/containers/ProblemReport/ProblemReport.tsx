import React, { useState } from 'react';
import ProblemCard from './ProblemCard';

export interface Problem {
  id: number;
  type: 'site bug' | 'accessibility issue';
  siteUrl: string;
  description: string;
  reporterEmail: string;
}

const sampleProblems: Problem[] = [
  {
    id: 1,
    type: 'site bug',
    siteUrl: 'https://example.com',
    description:
      'Login button not working on mobile devices, especially on Login button not working on mobile devices, especially on iPhones runn Login button not working on mobile devices, especially on iPhones runn Login button not working on mobile devices, especially on iPhones runnLogin button not working on mobile devices, especially on iPhones runn Login button not working on mobile devices, especially on iPhones runn iPhones running iOS 15 and above. Users report that the button is unresponsive and does not trigger any action, making it impossible to log in without switching to a desktop browser.',
    reporterEmail: 'user1@example.com',
  },
  {
    id: 2,
    type: 'accessibility issue',
    siteUrl: 'https://example.org',
    description:
      'The text on the homepage has very low contrast compared to the background, particularly in sections with light gray backgrounds. This makes it difficult for visually impaired users to read, especially under certain lighting conditions.',
    reporterEmail: 'user2@example.com',
  },
  {
    id: 3,
    type: 'site bug',
    siteUrl: 'https://example.net',
    description:
      'Images in the gallery section fail to load on browsers like Firefox and Safari. Upon inspection, it seems the server returns a 403 forbidden error for those images, possibly due to incorrect file permissions or CDN configurations.',
    reporterEmail: 'user3@example.com',
  },
  {
    id: 4,
    type: 'accessibility issue',
    siteUrl: 'https://example.edu',
    description:
      'Screen readers fail to interpret the dropdown menu items properly. Users relying on assistive technologies cannot navigate the dropdown menu, as the `aria-labels` are either missing or incorrectly configured.',
    reporterEmail: 'user4@example.com',
  },
  {
    id: 5,
    type: 'site bug',
    siteUrl: 'https://example.co',
    description:
      'Search functionality returns incorrect results for several queries. For instance, searching "contact" shows unrelated pages instead of the contact page. The issue seems to be with the search index being outdated or incomplete.',
    reporterEmail: 'user5@example.com',
  },
  {
    id: 6,
    type: 'accessibility issue',
    siteUrl: 'https://example.info',
    description:
      'Many images lack `alt` text, making it challenging for visually impaired users to understand the context of these images when using screen readers. This issue is widespread across multiple pages, including the blog and product sections.',
    reporterEmail: 'user6@example.com',
  },
  {
    id: 7,
    type: 'site bug',
    siteUrl: 'https://example.biz',
    description:
      'The contact form does not submit data when users attempt to include attachments larger than 1MB. Instead, the form appears to freeze without providing any error messages or feedback to the user.',
    reporterEmail: 'user7@example.com',
  },
  {
    id: 8,
    type: 'accessibility issue',
    siteUrl: 'https://example.io',
    description:
      'Keyboard navigation skips dropdown menus entirely, making it impossible for users relying on tab navigation to access key parts of the site. This impacts accessibility compliance and usability for keyboard users.',
    reporterEmail: 'user8@example.com',
  },
  {
    id: 9,
    type: 'site bug',
    siteUrl: 'https://example.app',
    description:
      'Footer links redirect to 404 error pages for many critical resources, including the Privacy Policy and Terms of Service pages. This can create compliance issues and frustrates users.',
    reporterEmail: 'user9@example.com',
  },
  {
    id: 10,
    type: 'accessibility issue',
    siteUrl: 'https://example.tech',
    description:
      'Colorblind users are unable to distinguish between chart colors used in the analytics section. The issue is exacerbated by the lack of patterns or labels to identify data points, making the information inaccessible.',
    reporterEmail: 'user10@example.com',
  },
  {
    id: 11,
    type: 'site bug',
    siteUrl: 'https://example.dev',
    description:
      'Video player controls fail to respond on iOS devices, preventing users from pausing, rewinding, or skipping videos. This issue occurs intermittently but has been widely reported by users.',
    reporterEmail: 'user11@example.com',
  },
  {
    id: 12,
    type: 'accessibility issue',
    siteUrl: 'https://example.ai',
    description:
      'Video content does not have captions or transcripts, making it inaccessible to users with hearing impairments. This issue affects all video resources on the site, including tutorials and webinars.',
    reporterEmail: 'user12@example.com',
  },
  {
    id: 13,
    type: 'site bug',
    siteUrl: 'https://example.xyz',
    description:
      'Dropdown menu options are unclickable when viewed in Internet Explorer 11. The issue seems to be related to missing polyfills or outdated JavaScript handling.',
    reporterEmail: 'user13@example.com',
  },
  {
    id: 14,
    type: 'accessibility issue',
    siteUrl: 'https://example.space',
    description:
      'Buttons across the site lack descriptive labels for screen readers. For instance, the "Submit" button in forms is only labeled as "button," making it unclear what action it performs.',
    reporterEmail: 'user14@example.com',
  },
  {
    id: 15,
    type: 'site bug',
    siteUrl: 'https://example.pro',
    description:
      'User profiles fail to update after editing. Changes to profile pictures, bios, and email addresses are not saved despite the UI showing a successful confirmation message.',
    reporterEmail: 'user15@example.com',
  },
  {
    id: 16,
    type: 'accessibility issue',
    siteUrl: 'https://example.media',
    description:
      'Text becomes unreadable on smaller devices when users zoom in to enlarge the font size. The layout breaks, causing text to overlap with other elements.',
    reporterEmail: 'user16@example.com',
  },
  {
    id: 17,
    type: 'site bug',
    siteUrl: 'https://example.tv',
    description:
      'Page loading time exceeds 10 seconds due to unoptimized images and blocking JavaScript. Users report frequent timeouts when accessing high-traffic pages.',
    reporterEmail: 'user17@example.com',
  },
  {
    id: 18,
    type: 'accessibility issue',
    siteUrl: 'https://example.news',
    description:
      'Header navigation links lack focus indicators, making it hard for keyboard users to determine which link is currently focused. This is particularly an issue in multi-level menus.',
    reporterEmail: 'user18@example.com',
  },
  {
    id: 19,
    type: 'site bug',
    siteUrl: 'https://example.store',
    description:
      'Product images fail to enlarge on click, leaving users unable to view product details clearly. The issue seems to affect both desktop and mobile users.',
    reporterEmail: 'user19@example.com',
  },
  {
    id: 20,
    type: 'accessibility issue',
    siteUrl: 'https://example.agency',
    description:
      'Form fields lack placeholder text or aria-labels, making it unclear for users (especially those with assistive technologies) what information is required in each field.',
    reporterEmail: 'user20@example.com',
  },
];

const ProblemReport: React.FC = () => {
  const [filter, setFilter] = useState<
    'all' | 'site bug' | 'accessibility issue'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProblems = sampleProblems.filter((problem) => {
    const matchesType = filter === 'all' ? true : problem.type === filter;
    const matchesSearch = problem.siteUrl
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 py-6 sm:py-8 md:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 sm:mb-12 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900">
            Reported Problems
          </h1>
          <p className="mt-3 max-w-md mx-auto text-sm sm:text-base md:text-lg text-gray-500 md:mt-5 md:max-w-3xl">
            View and manage issues reported across your websites
          </p>
        </header>

        <div className="mb-6 sm:mb-8 flex md:flex-row ms:flex-col justify-center items-center gap-4">
          <div className="w-auto">
            <select
              className="w-full sm:w-auto text-sm sm:text-base inline-flex items-center justify-center px-4 py-2 sm:px-5 sm:py-3 border border-transparent font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">All Problems</option>
              <option value="site bug">Site Bugs</option>
              <option value="accessibility issue">Accessibility Issues</option>
            </select>
          </div>

          <div className="w-auto flex-grow max-w-md">
            <input
              type="text"
              className="w-full px-4 py-2 sm:px-5 sm:py-3 border border-gray-300 rounded-md text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-500"
              placeholder="Search by site URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-1 lg:grid-cols-3">
          {filteredProblems.map((problem) => (
            <ProblemCard key={problem.id} problem={problem} />
          ))}
        </div>

        {filteredProblems.length === 0 && (
          <p className="text-center text-gray-500 mt-8">No problems found matching your criteria.</p>
        )}
      </div>
    </div>
  );
};

export default ProblemReport;
