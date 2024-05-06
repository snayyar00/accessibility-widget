import React from 'react';
import DashboardCard from './DashboardCard';

interface CardProps {
  heading: string;
  profileCounts:Record<string, number>;
}
const ImpressionCard: React.FC<CardProps> = ({ heading,profileCounts }) => (
  <div className="flex flex-col items-start justify-center w-full mb-8">
    <div className={`dashboard-card w-full`} style={{"minHeight":profileCounts ? (String(300 *  Math.floor((Object.keys(profileCounts).length/4)))+"px"):("180px")}}>
      <div className="card-content">
        <div className="card-header">
          <h2 className="card-title">{heading}</h2>
        </div>
        <div className="cards-row flex flex-wrap justify-center">
          {profileCounts !== undefined ? (Object.keys(profileCounts).map((profile,index)=>(<DashboardCard key={index} heading={profile} count={profileCounts[profile]} countType={profile} />))
          ):(null)}
        </div>
      </div>
    </div>
  </div>
);

export default ImpressionCard;
