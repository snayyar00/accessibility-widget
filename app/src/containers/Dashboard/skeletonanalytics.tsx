import type React from "react"

const SkeletonMetricCard: React.FC = () => (
  <div className="bg-white rounded-lg shadow p-4 animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="h-4 bg-[#f5f7fd] rounded w-1/2"></div>
      <div className="h-6 w-6 bg-[#f5f7fd] rounded-full"></div>
    </div>
    <div className="h-8 bg-[#f5f7fd] rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-[#f5f7fd] rounded w-1/4"></div>
  </div>
)

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
)

const SkeletonSubscriptionDashboard: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    {/* Left Panel - WebAbility Promo */}
    <div className="bg-light-blue text-white rounded-lg p-8 animate-pulse flex flex-col justify-between">
      <div className="space-y-4">
        <div className="h-10 bg-[#f5f7fd] rounded w-3/4"></div>
        <div className="h-24 bg-[#f5f7fd] rounded w-full"></div>
      </div>

      {/* Illustration placeholder */}
      <div className="h-40 bg-[#f5f7fd]  rounded-lg my-6 mx-auto w-full"></div>

      <div className="h-12 bg-light-blue rounded-lg w-full mt-4"></div>
    </div>

    {/* Right Panel - Subscription Details */}
    <div className="bg-white rounded-lg p-6 shadow animate-pulse">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-[#f5f7fd] rounded"></div>
          <div className="h-6 bg-[#f5f7fd] rounded w-48"></div>
        </div>
        <div className="h-10 bg-[#f5f7fd] rounded w-32"></div>
      </div>

      {/* Total Active Sites */}
      <div className="bg-white rounded-lg p-4 mb-8 shadow">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-8 bg-[#f5f7fd] rounded-full"></div>
          <div className="h-5 bg-[#f5f7fd] rounded w-36"></div>
        </div>
        <div className="h-12 bg-[#f5f7fd] rounded w-16 mx-auto"></div>
      </div>

      {/* Billing Tabs */}
      <div className="flex justify-center gap-4 mb-6">
        <div className="h-10 bg-[#f5f7fd] rounded w-36"></div>
        <div className="h-10 bg-[#f5f7fd] rounded w-36"></div>
      </div>

      {/* Active and Trial Sites */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-[#f5f7fd] rounded"></div>
              <div className="h-5 bg-[#f5f7fd] rounded w-24"></div>
            </div>
            <div className="h-8 w-8 bg-[#f5f7fd] rounded-full"></div>
          </div>
          <div className="h-3 bg-blue-200 rounded-full w-full">
            <div className="h-3 bg-blue-500 rounded-full w-3/4"></div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 bg-[#f5f7fd] rounded"></div>
              <div className="h-5 bg-[#f5f7fd] rounded w-24"></div>
            </div>
            <div className="h-8 w-8 bg-[#f5f7fd] rounded-full"></div>
          </div>
          <div className="h-3 bg-blue-200 rounded-full w-full">
            <div className="h-3 bg-blue-500 rounded-full w-1/6"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

export default function AnalyticsDashboardSkeleton({profileCount}:any)  {
  return (
    <>
      <div className="p-4 space-y-4 bg-[#f5f7fd]">
        {/* Subscription Dashboard Skeleton */}
        <SkeletonSubscriptionDashboard />
        

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
  )
}
