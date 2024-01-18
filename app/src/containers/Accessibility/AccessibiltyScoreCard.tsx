import React from 'react';
import './Accessibility.css'; // Make sure your CSS file is updated with the styles for the accordion
import CircularProgressWithLabel from './CircularProgressWithLabel';


interface AccessibilityScoreCardProps {
  score: number;
}

const AccessibilityScoreCard: React.FC<AccessibilityScoreCardProps> = ({ score }) => {
  const scoreClass = score > 89 ? 'green' : 'red';
  const scoreDescription = score > 89 ? 'You are 90% + compliant with WCAG 2.1 AA!' : 'Websites with a score of 70% or lower are considered at high risk.';

  return (
    <div className="accessibility-card">
      <div className="card-header">Accessibility Score</div>
      <div className='mb-8 mt-5'>
        <CircularProgressWithLabel value={score} size={110} />
      </div>
      <p>{scoreDescription}</p>
    </div>
  );
};

export default AccessibilityScoreCard;
