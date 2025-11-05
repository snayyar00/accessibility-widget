import type React from 'react';

// Skeleton for just the metric cards (NOT the hero banner!)
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

// Skeleton for just the charts
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

/**
 * DataOnlySkeleton - Shows skeleton ONLY for dynamic data
 * 
 * This does NOT include the hero banner skeleton!
 * The "Design for Everyone" section is static and should always be visible.
 */
export default function DataOnlySkeleton() {
  return (
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
}

