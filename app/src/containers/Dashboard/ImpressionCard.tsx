import React, { useState } from 'react';
import DashboardCard from './DashboardCard';

interface CardProps {
  heading: string;
  profileCounts: Record<string, number>;
}

const ImpressionCard: React.FC<CardProps> = ({ heading, profileCounts }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    if (Object.keys(profileCounts).length > 3)
    {
      setDropdownOpen(!dropdownOpen);
    }
  };

  return (
    <div className="flex flex-col items-start justify-center w-full mb-8">
      <div
        className={`dashboard-card w-full`}
        style={{
          minHeight: dropdownOpen
            ? String(
                (window.innerWidth <= 768 ? 380 : 150) *
                  Math.ceil(Object.keys(profileCounts).length / 4) +
                  'px',
              )
            : window.innerWidth <= 768
            ? '410px'
            : '190px',
        }}
      >
        <div className="card-content">
          <div className="card-header" onClick={toggleDropdown}>
            <h2 className="card-title">{heading}</h2>
            {Object.keys(profileCounts).length > 3 ? (
              <span>{dropdownOpen ? '▲' : '▼'}</span>
            ) : null}
          </div>
          {dropdownOpen && (
            <div className="cards-row flex flex-wrap justify-center">
              {profileCounts !== undefined &&
                Object.keys(profileCounts).map((profile, index) => (
                  <DashboardCard
                    key={index}
                    heading={profile}
                    count={profileCounts[profile]}
                    countType={profile}
                  />
                ))}
            </div>
          )}
          {!dropdownOpen && (
            <div className="cards-row flex flex-wrap justify-center">
              {profileCounts !== undefined &&
                Object.keys(profileCounts)
                  .slice(0, 3)
                  .map((profile, index) => (
                    <DashboardCard
                      key={index}
                      heading={profile}
                      count={profileCounts[profile]}
                      countType={profile}
                    />
                  ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImpressionCard;
