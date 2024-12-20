import React, { useEffect, useState } from 'react';
import ProblemCard from './ProblemCard';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import { CircularProgress } from '@mui/material';

export interface Problem {
  id: number;
  site_id: number;
  issue_type: 'bug' | 'accessibility';
  site_url: string;
  description: string;
  reporter_email: string;
  created_at: string;
}

const ProblemReport: React.FC = () => {
  const [problemArray, setProblemArray] = useState<Problem[]>([]);
  const { data, loading } = useSelector((state: RootState) => state.user);
  const [loader, setLoader] = useState(true);
  const [filter, setFilter] = useState<'all' | 'bug' | 'accessibility'>('all');

  const fetchProblemReports = async () => {
    setLoader(true)
    const url = `${process.env.REACT_APP_BACKEND_URL}/get-problem-reports`;
    const bodyData = { user_id: data.id };

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        response.json().then((data) => {
          // Handle the JSON data received from the backend
          console.log(data);
          setProblemArray(data);
          setLoader(false);
        });
      })
      .catch((error) => {
        // Handle error
        console.error('There was a problem with the fetch operation:', error);
      });
  };

  useEffect(() => {
    fetchProblemReports();
  }, []);

  const [searchTerm, setSearchTerm] = useState('');

  const filteredProblems = problemArray.filter((problem) => {
    const matchesType = filter === 'all' ? true : problem.issue_type === filter;
    const matchesSearch = problem.site_url
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

        {loader ? (
          <div className='flex justify-center'>
            <CircularProgress
            size={100}
            sx={{ color: '#0080ff' }}
            className="mx-auto my-auto"
          />
          </div>
          
        ) : (
          <>
            <div className="mb-6 sm:mb-8 flex md:flex-row ms:flex-col justify-center items-center gap-4">
              <div className="w-auto">
                <select
                  className="w-full sm:w-auto text-sm sm:text-base inline-flex items-center justify-center px-4 py-2 sm:px-5 sm:py-3 border border-transparent font-medium rounded-md text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                >
                  <option value="all">All Problems</option>
                  <option value="bug">Site Bugs</option>
                  <option value="accessibility">Accessibility Issues</option>
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
              <p className="text-center text-gray-500 mt-8">
                No problems found matching your criteria.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProblemReport;
