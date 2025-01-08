import React from 'react';

const SkeletonMetricCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-4 animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="h-4 bg-[#f5f7fd] rounded w-1/2"></div>
      <div className="h-6 w-6 bg-[#f5f7fd] rounded-full"></div>
    </div>
    <div className="h-8 bg-[#f5f7fd] rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-[#f5f7fd] rounded w-1/4"></div>
  </div>
);

const SkeletonChartCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-4 animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div>
        <div className="h-4 bg-[#f5f7fd] rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-[#f5f7fd] rounded w-1/3"></div>
      </div>
      <div className="h-8 bg-[#f5f7fd] rounded w-1/4"></div>
    </div>
    <div className="h-[200px] bg-[#f5f7fd] rounded"></div>
  </div>
);

export default function AnalyticsDashboardSkeleton({profileCount}:any) {
  return (
    <>
      <div className="p-4 space-y-4 bg-[#f5f7fd]">

        <div className="flex justify-between items-center">
          <div className="h-10 bg-white shadow rounded w-32 animate-pulse"></div>
          <div className="h-10 bg-white shadow rounded w-32 animate-pulse"></div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <SkeletonMetricCard key={index} />
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonChartCard />
          <SkeletonChartCard />
        </div>
      </div>
    </>
  );
}

