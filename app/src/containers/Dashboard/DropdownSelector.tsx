// DropdownSelector.tsx
import React, { useEffect, useState } from 'react';
import './DropdownSelector.css';

interface DropdownSelectorProps {
  granularity: string;
  weekStart: string;
  monthStart: string;
  yearStart: string;
  onGranularityChange: (newGranularity: string) => void;
  setStartDate: (startDate: string) => void;
}

const DropdownSelector: React.FC<DropdownSelectorProps> = ({
  granularity,
  onGranularityChange,
  setStartDate,
  weekStart,
  monthStart,
  yearStart
}) => {
  const [timeRange, setTimeRange] = useState<string>('Week To Date');
  console.log(monthStart, yearStart, weekStart)

  async function changeTimePeriod(range: string) {
    if (range === 'Month To Date') {
      setStartDate(monthStart);
    }
    else if (range === 'Week To Date') {
      setStartDate(weekStart);
    }
    else if (range === 'Year To Date') {
      setStartDate(yearStart);
    }
    setTimeRange(range);
  }

  return (
    <div className="dropdown-selector-container">
      <div className="dropdown-selector">
        <label htmlFor="time-range" className="dropdown-label">
          Time Range
        </label>
        <select
          id="time-range"
          value={timeRange}
          onChange={(e) => changeTimePeriod(e.target.value)}
          className="dropdown"
        >
          <option value="Week To Date">Week To Date</option>
          <option value="Month To Date">Month To Date</option>
          <option value="Year To Date">Year To Date</option>
        </select>
      </div>
      {/* <div className="dropdown-selector">
        <label htmlFor="granularity" className="dropdown-label">
          Granularity
        </label>
        <select
          id="granularity"
          value={granularity}
          onChange={(e) => onGranularityChange(e.target.value)}
          className="dropdown"
        >
          <option value="Day">Day</option>
          <option value="Week">Week</option>
          <option value="Month">Month</option>
        </select>
      </div> */}
    </div>
  );
};

export default DropdownSelector;
