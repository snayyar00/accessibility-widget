import {
  FaBolt,
  FaBookOpen,
  FaBrain,
  FaEye,
  FaEyeSlash,
  FaFont,
  FaMousePointer,
  FaPalette,
  FaUser,
  FaWheelchair,
} from 'react-icons/fa';
import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

const MetricCard: React.FC<{
  title: string;
  value: Number;
  change: string;
  icon: React.ReactNode;
}> = ({ title, value, change, icon }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      {icon}
    </div>
    <div className="text-2xl font-bold">{value}</div>
    <p
      className={`text-xs ${
        change.startsWith('+') ? 'text-green-500' : 'text-red-500'
      }`}
    >
      {change}
    </p>
  </div>
);

const ChartCard: React.FC<{
  title: string;
  value: string;
  change: string;
  data: any[];
  dataKey: string;
  subtitle?: string;
}> = ({ title, value, change, data, dataKey, subtitle }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <div className="flex items-center justify-between mb-2">
      <div>
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="text-2xl font-bold">
        {value}
        <span className="ml-2 text-xs text-green-500">{change}</span>
      </div>
    </div>
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: 'white',
              border: 'none',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
            labelStyle={{ fontWeight: 'bold' }}
            labelFormatter={(value) => new Date(value).toLocaleDateString()}
          />
          <Bar dataKey={dataKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export default function AnalyticsDashboard({
  impressionCount,
  visitorCount,
  widgetOpenCount,
  chartData,
  setStartDate,
  weekStart,
  monthStart,
  yearStart,
  timeRange,
  setTimeRange,
  profileCounts,
}: any) {
  // Filter data based on time range
  const filterData = (range: 'week' | 'month' | 'year') => {
    // const days = range === 'week' ? 7 : range === 'month' ? 30 : 365;
    const filteredData = chartData;

    return {
      engagement: filteredData.map((item: any) => ({
        date: item.date,
        value: item.engagement,
      })),
      impressions: filteredData.map((item: any) => ({
        date: item.date,
        value: item.impressions,
      })),
    };
  };

  const [profileCountlength,_] = useState(Object.keys(profileCounts).length);
  const data = filterData(timeRange);
  //   console.log("td",data);
  const totalEngagements = data.engagement.reduce(
    (sum: any, item: any) => sum + item.value,
    0,
  );

  async function changeTimePeriod(e: any) {
    if (e.target.value === 'month') {
      setStartDate(monthStart);
    } else if (e.target.value === 'week') {
      setStartDate(weekStart);
    } else if (e.target.value === 'year') {
      setStartDate(yearStart);
    }
    setTimeRange(e.target.value as 'week' | 'month' | 'year');
  }

  const mainMetrics = [
    {
      title: 'Impressions',
      value: impressionCount,
      change: '',
      icon: <FaEye className="h-6 w-6 text-primary" />,
    },
    {
      title: 'Unique Visitors',
      value: visitorCount,
      change: '',
      icon: <FaUser className="h-6 w-6 text-primary" />,
    },
    {
      title: 'Widget Opened',
      value: widgetOpenCount,
      change: '',
      icon: <FaMousePointer className="h-6 w-6 text-primary" />,
    },
  ];

  const additionalMetrics = Object.entries(profileCounts).map(
    ([key, value]) => {
      const icons: { [key: string]: JSX.Element } = {
        adhd: <FaBrain className="h-6 w-6 text-primary" />,
        blind: <FaEyeSlash className="h-6 w-6 text-primary" />,
        'color-blind': <FaPalette className="h-6 w-6 text-primary" />,
        'dyslexia-font': <FaFont className="h-6 w-6 text-primary" />,
        'motor-impaired': <FaWheelchair className="h-6 w-6 text-primary" />,
        'seizure-epileptic': <FaBolt className="h-6 w-6 text-primary" />,
        'visually-impaired': <FaEye className="h-6 w-6 text-primary" />,
        'cognitive-learning': <FaBookOpen className="h-6 w-6 text-primary" />,
      };
      return {
        title: key[0].toUpperCase() + key.slice(1),
        value: Number(value),
        change: '',
        icon: icons[key],
      };
    },
  );

  const [showMoreMetrics, setShowMoreMetrics] = useState(false);

  return (
    <div className="p-4 space-y-4 bg-gray-100">
      <div className={`flex flex-col-reverse gap-4 ${Object.keys(profileCounts).length ? "md:flex-row":"md:flex-row-reverse"} justify-between md:items-end`}>
        {Object.keys(profileCounts).length ? (
          <button
            className="bg-primary hover:bg-blue-600 text-white py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setShowMoreMetrics(!showMoreMetrics)}
          >
            {showMoreMetrics ? 'Show Less' : 'Show More'}
          </button>
        ):null}

        <div className="flex flex-col justify-center gap-2">
          <label htmlFor="time-range" className="dropdown-label">
            Time Range
          </label>
          <select
            className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={timeRange}
            onChange={changeTimePeriod}
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      <div className="analytics-cards grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mainMetrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {showMoreMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
          {additionalMetrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard
          title="Engagement"
          value={totalEngagements}
          change={''}
          data={data.engagement}
          dataKey="value"
        />
        <ChartCard
          title="Impressions"
          value={impressionCount}
          change={''}
          data={data.impressions}
          dataKey="value"
        />
      </div>
    </div>
  );
}
