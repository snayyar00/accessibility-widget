import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import getVisitorCountQuery from '@/queries/dashboard/getVisitorCount';
import getEngagementQuery from '@/queries/dashboard/getEngagement';
import getImpressionsQuery from '@/queries/dashboard/getImpressions';
import { useQuery } from '@apollo/client';
import './Dashboard.css';
import TrialBannerAndModal from './TrialBannerAndModal';
import AnalyticsDashboard from './Analytics';
import AnalyticsDashboardSkeleton from './skeletonanalytics';
import DataOnlySkeleton from './DataOnlySkeleton';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import useOrganizationName from '@/hooks/useOrganizationName';
import { FaCheckCircle } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';
import TourGuide from '@/components/Common/TourGuide';
import { defaultTourStyles } from '@/config/tourStyles';
import { getDashboardTourSteps, tourKeys } from '@/constants/toursteps';
import getDomainStatus from '@/utils/getDomainStatus';
import applyStatusClass from '@/utils/applyStatusClass';
import dashboardImage from '@/assets/images/dashboard_image.png';
import { baseColors } from '@/config/colors';
import { useSelector } from 'react-redux';
import { RootState } from '@/config/store';
import ProtectionLevelCard from './ProtectionLevelCard';
import DashboardAccessibilityCard from './DashboardAccessibilityCard';
import DashboardIssuesCard from './DashboardIssuesCard';

interface ChartData {
  date: string;
  engagement: number;
  impressions: number;
}

interface EngagementResponse {
  date: string;
  totalEngagements: number;
  totalImpressions: number;
}

interface CardData {
  id: number;
  heading: string;
  count: number;
  countType: string;
}

export type TDomain = {
  id: string;
  url: string;
  __typename: string;
  trial?: number;
};

const Dashboard: React.FC<any> = ({
  domain,
  domainData,
  allDomains,
  setReloadSites,
  customerData,
}: any) => {
  const { t } = useTranslation();
  const organizationName = useOrganizationName();
  useDocumentHeader({ title: t('Common.title.dashboard') });
  const organization = useSelector(
    (state: RootState) => state.organization.data,
  );

  // Get colors configuration
  // Using baseColors directly
  // const [startDate, setStartDate] = useState<string>();
  // const [endDate, setEndDate] = useState<string>();
  const [impressions, setImpressions] = useState<number>(0);
  const [widgetClosed, setWidgetClosed] = useState<number>(0);
  const [widgetOpened, setWidgetOpened] = useState<number>(0);
  const [uniqueVisitors, setUniqueVisitors] = useState<number>(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [granularity, setGranularity] = useState<string>('Day');
  const [loadingAnimation, setLoadingAnimation] = useState<boolean>(true);
  const [profileCounts, setProfileCounts] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const [paymentView, setPaymentView] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  const [isMediumScreen, setIsMediumScreen] = useState<boolean>(false);
  const history = useHistory();

  const handleRedirect = () => {
    history.push('/add-domain?open-modal=true');
  };

  const getStartOfWeek = () => {
    const currentDate = new Date();
    const firstDayOfWeek =
      currentDate.getDate() -
      currentDate.getDay() +
      (currentDate.getDay() === 0 ? -6 : 1);
    return new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      firstDayOfWeek,
    )
      .toISOString()
      .split('T')[0];
  };

  const getStartOfYear = () => {
    const currentDate = new Date();
    return new Date(currentDate.getFullYear(), 0, 1)
      .toISOString()
      .split('T')[0];
  };

  const getStartOfMonth = () => {
    const currentDate = new Date();
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      .toISOString()
      .split('T')[0];
  };

  const generateDateRange = (start: string, end: string) => {
    const sD = new Date(start);
    const eD = new Date(end);

    const dateArray: string[] = [];
    let currentDate = sD;

    while (currentDate <= eD) {
      dateArray.push(currentDate.toISOString().split('T')[0]);
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateArray;
  };

  function setChart(data: any) {
    if (data.getEngagementRates.length !== 0) {
      setChartData(
        data.getEngagementRates.map((engagement: EngagementResponse) => ({
          date: engagement.date,
          engagement: engagement.totalEngagements,
          impressions: engagement.totalImpressions,
        })),
      );
    } else {
      // Populate chart data with 0 values for each date in the date range
      const dateRange = generateDateRange(startDate!, endDate!);
      setChartData(
        dateRange.map((date) => ({
          date,
          engagement: 0,
          impressions: 0,
        })),
      );
    }
  }

  const today = new Date();
  const defaultEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 2,
  )
    .toISOString()
    .slice(0, 10);

  const defaultStart = (() => {
    const d = new Date();
    const firstDay = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), firstDay)
      .toISOString()
      .slice(0, 10);
  })();

  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate] = useState<string>(defaultEnd);

  const [appSumoDomains, setAppSumoDomain] = useState<string[] | undefined>(
    undefined,
  );

  // ⚡ PROGRESSIVE LOADING: Three separate queries
  // Each completes independently and displays as soon as ready!
  
  const skipQuery = !domain || domain === 'Select a Domain' || domain === 'No domains available';

  // Query 1: Visitor Count (fastest - ~873ms) ⚡
  const { 
    data: visitorData, 
    loading: visitorLoading 
  } = useQuery(getVisitorCountQuery, {
    variables: { url: domain, startDate, endDate },
    skip: skipQuery,
    fetchPolicy: 'cache-first',
  });

  // Query 2: Engagement Rates (fast - ~870ms) ⚡
  const { 
    data: engagementData, 
    loading: engagementLoading 
  } = useQuery(getEngagementQuery, {
    variables: { url: domain, startDate, endDate },
    skip: skipQuery,
    fetchPolicy: 'cache-first',
  });

  // Query 3: Impressions (slower - ~4088ms) 🐌
  const { 
    data: impressionsData, 
    loading: impressionsLoading 
  } = useQuery(getImpressionsQuery, {
    variables: { url: domain, startDate, endDate },
    skip: skipQuery,
    fetchPolicy: 'cache-first',
  });

  // Combined loading state for backward compatibility
  const loading = visitorLoading || engagementLoading || impressionsLoading;
  
  const [domainStatus, setDomainStatus] = useState<string | undefined>(
    undefined,
  );
  const [statusClass, setStatusClass] = useState<string | undefined>(undefined);

  // REMOVED: No longer using single loadingAnimation state
  // Each section will show its own loading state independently!

  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 640); // 640px is Tailwind's sm breakpoint
      setIsMediumScreen(window.innerWidth >= 640 && window.innerWidth < 1024); // md breakpoint (640px - 1024px)
    };

    // Check on mount
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // ⚡ Process visitor data as soon as it arrives!
  useEffect(() => {
    if (visitorData?.getSiteVisitorsByURL) {
      setUniqueVisitors(visitorData.getSiteVisitorsByURL.count);
      console.log('✓ Visitor count displayed:', visitorData.getSiteVisitorsByURL.count);
    }
  }, [visitorData]);

  // ⚡ Process engagement data as soon as it arrives!
  useEffect(() => {
    if (engagementData?.getEngagementRates) {
      setChart({ getEngagementRates: engagementData.getEngagementRates });
      console.log('✓ Engagement chart displayed with', engagementData.getEngagementRates.length, 'data points');
    }
  }, [engagementData]);

  // ⚡ Process impressions data as soon as it arrives!
  useEffect(() => {
    if (impressionsData?.getImpressionsByURLAndDate) {
      const impressionsOutput = impressionsData.getImpressionsByURLAndDate.impressions;
      
      let combinedProfileCounts: any = {};
      let wC = 0;
      let wO = 0;
      let i = 0;

      impressionsOutput.forEach((impression: any) => {
        // Check if profileCounts is not null
        if (impression.profileCounts !== null) {
          Object.entries(impression.profileCounts).forEach(([key, value]) => {
            combinedProfileCounts[key] =
              (combinedProfileCounts[key] || 0) + value;
          });
        }
        
        if (impression.widget_opened) {
          wO += 1;
        }
        if (impression.widget_closed) {
          wC += 1;
        }
        i += 1;
      });

      setProfileCounts(combinedProfileCounts);
      setWidgetOpened(wO);
      setWidgetClosed(wC);
      setImpressions(i);
      
      console.log('✓ Impressions displayed:', i, 'records,', wO, 'opened,', wC, 'closed');
    }
  }, [impressionsData]);

  useEffect(() => {
    setCards([
      {
        id: 1,
        heading: 'Impressions',
        count: impressions,
        countType: 'impressions',
      },

      {
        id: 2,
        heading: 'Visitors',
        count: uniqueVisitors,
        countType: 'people',
      },
      {
        id: 3,
        heading: 'Widget Opened',
        count: widgetOpened,
        countType: 'times',
      },
      // {
      //   id: 4,
      //   heading: 'Widget Closed',
      //   count: widgetClosed,
      //   countType: 'times',
      // },
      // ... more card data
    ]);
  }, [widgetClosed, widgetOpened, impressions, uniqueVisitors]);

  useEffect(() => {
    setCards((currentCards) =>
      currentCards.map((card) => ({
        ...card,
      })),
    );
  }, [granularity]);

  useEffect(() => {
    if (customerData?.subscriptions) {
      const appSumoDomains: any = [];
      let subs = JSON.parse(customerData.subscriptions);
      // console.log("subs = ",subs);
      ['monthly', 'yearly'].forEach((subscriptionType) => {
        // Loop over each subscription in the current type (monthly or yearly)
        subs[subscriptionType].forEach((subscription: any) => {
          const description = subscription.description;

          // Regex to extract domain name before '(' and promo codes
          const match = description?.match(/Plan for ([^(\s]+)\(/);

          if (match && match[1] && match[1].trim()) {
            const domain = match[1].trim();
            appSumoDomains.push(domain); // Save the domain name in the list
          }
        });
      });
      setAppSumoDomain(appSumoDomains);
      // setSubCount(subs.length);
    }
  }, [customerData]);

  const adjustCountByGranularity = (baseCount: number): number => {
    switch (granularity) {
      case 'Week':
        return baseCount * 7;
      case 'Month':
        return baseCount * 30;
      default:
        return baseCount;
    }
  };

  // Handle tour completion
  const handleTourComplete = () => {
    console.log('Dashboard tour completed!');
  };

  useEffect(() => {
    if (domainData != null && appSumoDomains != undefined) {
      setDomainStatus(
        getDomainStatus(
          domainData?.url,
          domainData?.expiredAt,
          domainData?.trial,
          appSumoDomains,
        ),
      );

      setStatusClass(
        applyStatusClass(
          domainData?.url,
          domainData?.expiredAt,
          domainData?.trial,
          appSumoDomains,
        ),
      );
    }
  }, [domainData, appSumoDomains]);

  return (
    <>
      <TourGuide
        steps={getDashboardTourSteps(organizationName)}
        tourKey={tourKeys.dashboard}
        autoStart={true}
        onTourComplete={handleTourComplete}
        customStyles={defaultTourStyles}
      />

      {/* ✅ ALWAYS show static hero banner - NO skeleton loading! */}
      <div className="w-full py-4">
        <div className="flex flex-col items-center justify-center w-full mb-4 px-4">
          <div className="w-full mb-3 flex">
            <div
              className="dashboard-welcome-banner w-full grid grid-cols-1 lg:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 min-h-[320px] sm:min-h-[380px] md:min-h-[450px] lg:min-h-[500px]"
              style={{
                backgroundImage: isMediumScreen ? 'none' : `url(${dashboardImage})`,
                backgroundSize: 'cover',
                backgroundPosition: isSmallScreen
                  ? 'center left'
                  : 'center right',
                backgroundRepeat: 'no-repeat',
                color: baseColors.white,
                backgroundColor: isMediumScreen ? '#000000' : 'transparent', // Black background for md screens
              }}
            >
              {/* Left Column - Content */}
              <div className="px-6 sm:px-8 md:px-10 py-8 md:py-10 h-full flex flex-col justify-center items-center md:items-start space-y-4 md:space-y-6 text-center md:text-left">
                <div className="space-y-6 md:pr-96 lg:pr-0">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl  leading-tight tracking-tight">
                    Design for Everyone
                  </h1>
                  <p className="text-base sm:text-xs md:text-xs lg:text-xl  font-normal leading-relaxed opacity-90 max-w-md md:max-w-20">
                    Achieve seamless ADA & WCAG compliance effortlessly with
                    {organizationName}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col flex-wrap lg:flex-row items-center justify-center gap-3 pt-4">
                  <button
                    className="get-compliant-button w-full sm:w-48 md:w-64 px-6 py-4 h-14 text-blue-900 text-lg font-medium rounded-2xl bg-blue-100 hover:bg-blue-200 border-0 transition-all duration-300 cursor-pointer"
                    onClick={handleRedirect}
                  >
                    Get compliant
                  </button>

                  {organization?.id === '1' && (
                  <button
                    className="app-sumo-button w-full sm:w-48 md:w-64 lg:w-64 flex justify-center px-6 py-4 h-14 text-white text-lg font-medium rounded-2xl bg-slate-800 hover:bg-slate-700 border-2 border-blue-400/50 transition-all duration-300 shadow-lg shadow-blue-400/20 hover:shadow-blue-400/30 cursor-pointer"
                    style={{ alignItems: 'center' }}
                    onClick={handleRedirect}
                  >
                    <span className=" lg:hidden">Appsumo</span>
                    <span className="hidden lg:inline">Redeem Appsumo</span>
                  </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ⚡ PROGRESSIVE LOADING: Pass individual loading states */}
      <div className="analytics-dashboard px-4">
        {/* Protection Level Card */}
        {domainData && (
          <div className="mb-6">
            <ProtectionLevelCard 
              protectionLevel={domainData.protection_level}
              siteId={domainData.id}
              siteUrl={domainData.url}
            />
          </div>
        )}

        {/* Dashboard Accessibility Report Card */}
        {domainData && (
          <div className="mb-6">
            <DashboardAccessibilityCard siteUrl={domainData.url} />
          </div>
        )}

        {/* Dashboard Issues Card */}
        {domainData && (
          <div className="mb-6">
            <DashboardIssuesCard siteUrl={domainData.url} />
          </div>
        )}
        
        <AnalyticsDashboard
          impressionCount={impressions}
          widgetOpenCount={widgetOpened}
          visitorCount={uniqueVisitors}
          chartData={chartData}
          setStartDate={setStartDate}
          weekStart={getStartOfWeek()}
          monthStart={getStartOfMonth()}
          yearStart={getStartOfYear()}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          profileCounts={profileCounts}
          loading={loading}
          // ⚡ Individual loading states for progressive display
          visitorLoading={visitorLoading}
          engagementLoading={engagementLoading}
          impressionsLoading={impressionsLoading}
        />
      </div>
    </>
  );
};
export default Dashboard;
