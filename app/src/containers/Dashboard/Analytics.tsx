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
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { baseColors } from '@/config/colors';

// Helper to format large numbers like 3500 -> 3.5k, 500000 -> 500k
const formatCompactNumber = (num: number | string) => {
  const value = typeof num === 'string' ? Number(num) : num;
  if (Number.isNaN(value)) return String(num);
  if (value >= 1_000_000_000)
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}b`;
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (value >= 1_000)
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(value);
};

const MetricCard: React.FC<{
  title: string;
  value: Number;
  change: string;
  icon: React.ReactNode;
}> = ({ title, value, change, icon }) => {
  // Using baseColors directly

  return (
    <div
      className="rounded-lg shadow p-4"
      style={{ backgroundColor: baseColors.white }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3
          className="text-sm font-medium"
          style={{ color: baseColors.grayText }}
        >
          {title}
        </h3>
        {icon}
      </div>
      <div className="text-2xl font-bold">
        {formatCompactNumber(value as unknown as number)}
      </div>
      <p
        className={`text-xs ${
          change.startsWith('+') ? 'text-green-500' : 'text-red-500'
        }`}
      >
        {change}
      </p>
    </div>
  );
};

// Inline metric used inside the grouped card to match the Figma design
const InlineMetric: React.FC<{
  title: string;
  value: number | string;
}> = ({ title, value }) => {
  // Using baseColors directly

  return (
    <div className="flex-1 flex flex-col gap-1 py-4 px-6">
      <span
        className="text-base md:text-lg font-medium"
        style={{ color: baseColors.grayText }}
      >
        {title}
      </span>
      <span
        className="text-4xl md:text-5xl leading-none tracking-tight"
        style={{ color: baseColors.brandNumbers }}
      >
        {formatCompactNumber(value)}
      </span>
    </div>
  );
};

const ChartCard: React.FC<{
  title: string;
  data: any[];
  dataKey: string;
  subtitle?: string;
  timeRange?: 'week' | 'month' | 'year';
  onChangeTimeRange?: (e: any) => void;
  compareLabel?: string;
}> = ({
  title,
  data,
  dataKey,
  subtitle,
  timeRange,
  onChangeTimeRange,
  compareLabel = 'than last week',
}) => {
  // Using baseColors directly
  // Custom tooltip to match the dark bubble style with a value and change percentage
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const currentValue = Number(payload[0].value ?? 0);
      const pointIndex = data.findIndex((d: any) => d.date === label);
      const previousValue =
        pointIndex > 0 ? Number(data[pointIndex - 1]?.[dataKey] ?? 0) : 0;
      const percentChange =
        previousValue > 0
          ? ((currentValue - previousValue) / previousValue) * 100
          : 0;
      const isUp = percentChange >= 0;

      return (
        <div>
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: baseColors.blueTooltip,
              color: 'white',
              boxShadow: '0 12px 28px rgba(11,75,102,0.25)',
              minWidth: 160,
            }}
          >
            <div className="flex items-center gap-2 text-white text-sm font-semibold">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full"
                style={{
                  backgroundColor: baseColors.blueTooltipUser,
                }}
              >
                <FaUser className="h-3.5 w-3.5" />
              </span>
              <span className="text-base font-semibold">
                {Number(currentValue).toLocaleString()}
              </span>
            </div>
            <div
              className={`mt-1 text-xs ${
                isUp ? 'text-emerald-300' : 'text-red-300'
              }`}
            >
              <span className="font-medium">
                {isUp ? '▲' : '▼'} {Math.abs(percentChange).toFixed(0)}%
              </span>{' '}
              <span className="opacity-90">{compareLabel}</span>
            </div>
          </div>
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: `8px solid ${baseColors.blueTooltip}`,
              margin: '0 auto',
            }}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="rounded-lg shadow p-4 border"
      style={{
        backgroundColor: baseColors.white,
        borderColor: baseColors.grayCard,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3
            className="text-lg font-semibold"
            style={{ color: baseColors.grayText }}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs" style={{ color: baseColors.grayText }}>
              {subtitle}
            </p>
          )}
        </div>
        {timeRange && onChangeTimeRange && (
          <select
            className="border border-gray-300 py-1.5 px-3 rounded-lg focus:outline-none text-sm appearance-none bg-no-repeat pr-6"
            style={{
              backgroundColor: baseColors.brandPrimary,
              color: baseColors.white,
              backgroundImage:
                "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23A7CAFF' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e\")",
              backgroundSize: '12px 12px',
              backgroundPosition: 'calc(100% - 8px) center',
            }}
            value={timeRange}
            onChange={onChangeTimeRange}
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="year">Last 12 months</option>
          </select>
        )}
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={baseColors.brandNumbers}
                  stopOpacity={0.25}
                />
                <stop
                  offset="95%"
                  stopColor={baseColors.brandNumbers}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={baseColors.grayGrid} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: baseColors.grayText }}
              axisLine={{ stroke: baseColors.grayGrid }}
              tickLine={false}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });
              }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: baseColors.grayText }}
              axisLine={{ stroke: baseColors.grayGrid }}
              tickLine={false}
              domain={[0, 4]}
              ticks={[0, 1, 2, 3, 4]}
              tickFormatter={(v) => `${Number(v).toFixed(1)}`}
              allowDecimals={true}
            />
            <Tooltip
              cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }}
              content={<CustomTooltip />}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={baseColors.brandNumbers}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#primaryGradient)"
              activeDot={{
                r: 6,
                fill: baseColors.brandNumbers,
                strokeWidth: 0,
              }}
              dot={false}
              style={{
                filter: 'drop-shadow(0px 6px 12px rgba(68, 90, 231, 0.3))',
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

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
  // Using baseColors directly
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

  const [profileCountlength, _] = useState(Object.keys(profileCounts).length);
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
      icon: (
        <FaEye className="h-6 w-6" style={{ color: baseColors.brandPrimary }} />
      ),
    },
    {
      title: 'Unique visitor',
      value: visitorCount,
      change: '',
      icon: (
        <FaUser
          className="h-6 w-6"
          style={{ color: baseColors.brandPrimary }}
        />
      ),
    },
    {
      title: 'Widget opened',
      value: widgetOpenCount,
      change: '',
      icon: (
        <FaMousePointer
          className="h-6 w-6"
          style={{ color: baseColors.brandPrimary }}
        />
      ),
    },
  ];

  const additionalMetrics = Object.entries(profileCounts).map(
    ([key, value]) => {
      const iconStyle = { color: baseColors.brandPrimary } as const;
      const icons: { [key: string]: JSX.Element } = {
        adhd: <FaBrain className="h-6 w-6" style={iconStyle} />,
        blind: <FaEyeSlash className="h-6 w-6" style={iconStyle} />,
        'color-blind': <FaPalette className="h-6 w-6" style={iconStyle} />,
        'dyslexia-font': <FaFont className="h-6 w-6" style={iconStyle} />,
        'motor-impaired': (
          <FaWheelchair className="h-6 w-6" style={iconStyle} />
        ),
        'seizure-epileptic': <FaBolt className="h-6 w-6" style={iconStyle} />,
        'visually-impaired': <FaEye className="h-6 w-6" style={iconStyle} />,
        'cognitive-learning': (
          <FaBookOpen className="h-6 w-6" style={iconStyle} />
        ),
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
    <div>
      {/* Grouped top metrics card to match Figma: single card with separators */}
      <div
        className="analytics-metrics-card rounded-2xl shadow p-2 md:p-3 border h-auto md:h-auto md:min-h-0 lg:h-[120px] lg:min-h-[120px]"
        style={{
          backgroundColor: baseColors.white,
          borderColor: baseColors.grayCard,
        }}
      >
        <div
          className="flex flex-row sm:flex-col md:flex-col lg:flex-row items-stretch divide-x sm:divide-x-0 sm:divide-y md:divide-y lg:divide-y-0 lg:divide-x md:h-full"
          style={
            {
              '--tw-divide-opacity': '1',
              '--tw-divide-color': baseColors.blueDivider,
            } as React.CSSProperties
          }
        >
          <InlineMetric
            title={mainMetrics[0].title}
            value={mainMetrics[0].value as unknown as number}
          />
          <InlineMetric
            title={mainMetrics[1].title}
            value={mainMetrics[1].value as unknown as number}
          />
          <InlineMetric
            title={mainMetrics[2].title}
            value={mainMetrics[2].value as unknown as number}
          />
        </div>
      </div>

      <div
        className={`flex flex-col-reverse gap-4 pt-4 ${
          Object.keys(profileCounts).length
            ? 'md:flex-row-reverse'
            : 'md:flex-row-reverse'
        } justify-between md:items-end`}
      >
        {Object.keys(profileCounts).length ? (
          <button
            className="show-more-metrics-button hover:brightness-110 py-2 px-4 rounded-lg focus:outline-none"
            style={{
              backgroundColor: baseColors.brandPrimary,
              color: baseColors.white,
            }}
            onClick={() => setShowMoreMetrics(!showMoreMetrics)}
          >
            {showMoreMetrics ? 'Show Less' : 'Show More'}
          </button>
        ) : null}
      </div>
      {showMoreMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
          {additionalMetrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>
      )}
      <div className="analytics-charts-section grid gap-4 md:grid-cols-2 pt-4">
        <ChartCard
          title="Engagement"
          data={data.engagement}
          dataKey="value"
          timeRange={timeRange}
          onChangeTimeRange={changeTimePeriod}
        />
        <ChartCard
          title="Impressions"
          data={data.impressions}
          dataKey="value"
          timeRange={timeRange}
          onChangeTimeRange={changeTimePeriod}
        />
      </div>
    </div>
  );
}
