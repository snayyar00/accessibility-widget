import type React from 'react';

const SkeletonMetricCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-4 animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
    </div>
    <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
  </div>
);

const SkeletonChartCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-4 animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
      </div>
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
    </div>
    <div className="h-[200px] bg-gray-200 rounded"></div>
  </div>
);

const SkeletonHeroBanner: React.FC = () => (
  <div className="w-full py-4">
    <div className="flex flex-col items-center justify-center w-full mb-4 px-4">
      <div className="w-full mb-3 flex">
        <div
          className="w-full grid grid-cols-1 lg:grid-cols-2 text-white rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 min-h-[320px] sm:min-h-[380px] md:min-h-[450px] lg:min-h-[500px] animate-pulse relative"
          style={{
            background: 'linear-gradient(to bottom, #4FC3F7, #1565C0)',
            backgroundImage: `
              linear-gradient(to bottom, #4FC3F7, #1565C0),
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 20px,
                rgba(255,255,255,0.03) 20px,
                rgba(255,255,255,0.03) 21px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 20px,
                rgba(255,255,255,0.03) 20px,
                rgba(255,255,255,0.03) 21px
              )
            `,
          }}
        >
          {/* Left Column - Content */}
          <div className="px-6 sm:px-8 md:px-10 py-8 md:py-10 h-full flex flex-col justify-center items-center md:items-start space-y-4 md:space-y-6 text-center md:text-left">
            <div className="space-y-6 md:pr-96 lg:pr-0">
              {/* Title skeleton */}
              <div className="h-12 sm:h-16 md:h-20 lg:h-24 bg-white/25 rounded-lg w-full"></div>
              {/* Subtitle skeleton */}
              <div className="h-4 sm:h-3 md:h-3 lg:h-6 bg-white/25 rounded w-3/4"></div>
            </div>

            {/* Action Buttons skeleton */}
            <div className="flex flex-col flex-wrap lg:flex-row items-center justify-center gap-3 pt-4">
              <div className="w-full sm:w-48 md:w-64 h-14 bg-white/25 rounded-2xl"></div>
              <div className="w-full sm:w-48 md:w-64 lg:w-64 h-14 bg-white/25 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const SkeletonAnalyticsSection: React.FC = () => (
  <div className="w-full">
    {/* Time range selector skeleton */}
    <div className="flex justify-between items-center mb-6 px-4">
      <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
      <div className="flex gap-2">
        <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
        <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
        <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
      </div>
    </div>

    {/* Metrics cards skeleton */}
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6 px-4">
      {[...Array(3)].map((_, index) => (
        <SkeletonMetricCard key={index} />
      ))}
    </div>

    {/* Charts section skeleton */}
    <div className="grid gap-4 md:grid-cols-2 px-4">
      <SkeletonChartCard />
      <SkeletonChartCard />
    </div>
  </div>
);

export default function AnalyticsDashboardSkeleton({ profileCount }: any) {
  return (
    <>
      <div className="w-full">
        {/* Hero Banner Skeleton */}
        <SkeletonHeroBanner />

        {/* Analytics Section Skeleton */}
        <SkeletonAnalyticsSection />
      </div>
    </>
  );
}
