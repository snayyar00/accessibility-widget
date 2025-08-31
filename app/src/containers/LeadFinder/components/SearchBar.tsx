import React, { useState } from 'react';
import { SearchBarProps } from '../types';
import { HiSearch, HiChevronDown } from 'react-icons/hi';

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, loading }) => {
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(5000);
  const [maxResults, setMaxResults] = useState(10);
  const [jobTitle, setJobTitle] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [useEnrichedSearch, setUseEnrichedSearch] = useState(true);
  const [aiMode, setAiMode] = useState(false);
  const [aiQuery, setAiQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSearch({
      category: aiMode ? 'businesses' : (category.trim() || 'businesses'),
      location: aiMode ? 'Global (Worldwide)' : (location.trim() || 'Global (Worldwide)'),
      radius,
      maxResults,
      jobTitle,
      companySize,
      useEnrichedSearch,
      aiMode,
      aiQuery: aiMode ? aiQuery.trim() : undefined
    });
  };

  const popularCategories = [
    'restaurants',
    'retail stores', 
    'consulting services',
    'real estate agencies',
    'real estate investment',
    'property management',
    'accounting firms',
    'law firms',
    'medical practices',
    'technology companies',
    'startups',
    'software companies',
    'marketing agencies',
    'construction companies',
    'hair salons',
    'auto repair shops',
    'fitness centers',
    'e-commerce businesses',
    'financial services',
    'insurance agencies'
  ];

  const jobTitleOptions = [
    'CEO', 'Founder', 'Co-Founder', 'President', 'Owner',
    'CTO', 'CIO', 'CMO', 'CFO', 'COO', 'VP', 'Vice President',
    'Director', 'Senior Director', 'Head of', 'General Manager',
    'Marketing Director', 'Sales Director', 'Operations Director',
    'Senior Manager', 'Manager', 'Team Lead', 'Senior Consultant',
    'Principal', 'Partner', 'Managing Partner', 'Board Member'
  ];

  const companySizeOptions = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '501-1000', label: '501-1000 employees' },
    { value: '1001-5000', label: '1001-5000 employees' },
    { value: '5001-10000', label: '5001-10000 employees' },
    { value: '10000+', label: '10000+ employees' }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6" role="search" aria-label="Lead finder search form">
        
        {/* Main Search Row - Input + Button */}
        <div className="flex items-center gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            {aiMode ? (
              <>
                <div className="absolute left-6 top-1/2 transform -translate-y-1/2 text-emerald-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Try: 'NYC real estate agencies with emails', 'SF tech startups 50+ employees'..."
                  className="w-full pl-16 pr-6 py-5 text-lg border-2 border-emerald-200 rounded-2xl focus:border-emerald-400 focus:outline-none bg-gradient-to-r from-emerald-50/80 to-green-50/60 placeholder-gray-600 text-gray-900 font-medium transition-all duration-300 shadow-sm"
                />
              </>
            ) : (
              <>
                <HiSearch className="absolute left-6 top-1/2 transform -translate-y-1/2 text-gray-500 w-6 h-6" />
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Search companies, industries, or business types..."
                  className="w-full pl-16 pr-6 py-5 text-lg border-2 border-gray-200 rounded-2xl focus:border-blue-400 focus:outline-none bg-white placeholder-gray-500 text-gray-900 font-medium transition-all duration-300 shadow-sm hover:border-gray-300"
                />
              </>
            )}
          </div>

          {/* Search Button - Aligned with input */}
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-2xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/30 shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none disabled:cursor-not-allowed min-w-[180px] self-stretch flex items-center justify-center"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Searching...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span>Search Leads</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            )}
          </button>
        </div>

        {/* Single Row Controls - Everything in One Line */}
        <div className="flex items-center justify-between gap-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50/60 rounded-2xl border border-gray-300/80 shadow-sm">
          {/* Left: Mode Toggles */}
          <div className="flex items-center gap-3">
            {/* AI Toggle with Tooltip */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => setAiMode(!aiMode)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  aiMode 
                    ? 'bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 ring-2 ring-emerald-200' 
                    : 'bg-white text-gray-800 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI
              </button>
              
              {/* Tooltip - Only show when NOT active */}
              {!aiMode && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                    Click to enable AI search
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </div>

            {/* Apollo Toggle with Tooltip */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => setUseEnrichedSearch(!useEnrichedSearch)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  useEnrichedSearch 
                    ? 'bg-purple-600 text-white shadow-lg hover:bg-purple-700 ring-2 ring-purple-200' 
                    : 'bg-white text-gray-800 border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Apollo+
              </button>
              
              {/* Tooltip - Only show when NOT active */}
              {!useEnrichedSearch && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                    Click to enable Apollo+ enhanced search
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Filters (Only show in Manual mode) */}
          {!aiMode && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-gray-800">Filters:</span>
              
              {/* Location */}
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm bg-white text-gray-800 focus:border-blue-500 focus:outline-none appearance-none bg-[url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3e%3c/svg%3e')] bg-[length:1.2em_1.2em] bg-[position:right_0.75rem_center] bg-no-repeat transition-colors duration-200 min-w-[140px] font-medium"
              >
                <option value="">🌍 Global</option>
                <option value="United States">🇺🇸 United States</option>
                <option value="New York, NY">🏙️ New York, NY</option>
                <option value="San Francisco, CA">🌉 San Francisco, CA</option>
                <option value="London, UK">🇬🇧 London, UK</option>
              </select>

              {/* Industry */}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-2.5 border-2 border-gray-300 rounded-lg text-sm bg-white text-gray-800 focus:border-blue-500 focus:outline-none appearance-none bg-[url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3e%3c/svg%3e')] bg-[length:1.2em_1.2em] bg-[position:right_0.75rem_center] bg-no-repeat transition-colors duration-200 min-w-[140px] font-medium"
              >
                <option value="">🏢 Industry</option>
                {popularCategories.slice(0, 8).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>

              {/* Results Count */}
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value))}
                className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:border-blue-400 focus:outline-none appearance-none bg-[url('data:image/svg+xml,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 20 20%27%3e%3cpath stroke=%27%236b7280%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%271.5%27 d=%27m6 8 4 4 4-4%27/%3e%3c/svg%3e')] bg-[length:1.2em_1.2em] bg-[position:right_0.75rem_center] bg-no-repeat transition-colors duration-200 min-w-[100px]"
              >
                <option value={10}>10 leads</option>
                <option value={25}>25 leads</option>
                <option value={50}>50 leads</option>
                <option value={100}>100 leads</option>
              </select>
            </div>
          )}

          {/* Show Status in AI mode */}
          {aiMode && (
            <div className="flex items-center text-sm text-emerald-700 font-semibold bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
              <svg className="w-4 h-4 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              AI mode active
            </div>
          )}
        </div>


        {/* Advanced Filters - Collapsible */}
        <div className="border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center justify-between w-full text-left text-gray-700 hover:text-gray-900 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Advanced Filters</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Apollo-level precision</span>
            </div>
            <HiChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdvancedFilters ? 'rotate-180' : ''}`} />
          </button>

          {showAdvancedFilters && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Job Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                <select
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:border-blue-400 focus:outline-none"
                >
                  <option value="">All Job Titles</option>
                  {jobTitleOptions.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>

              {/* Company Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Size</label>
                <select
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:border-blue-400 focus:outline-none"
                >
                  <option value="">All Company Sizes</option>
                  {companySizeOptions.map((size) => (
                    <option key={size.value} value={size.value}>{size.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default SearchBar;