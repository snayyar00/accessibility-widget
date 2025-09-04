import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import fetchDashboardQuery from '@/queries/dashboard/fetchDashboardQuery';
import { useLazyQuery, useQuery } from '@apollo/client';
import './Dashboard.css';
import TrialBannerAndModal from './TrialBannerAndModal';
import AnalyticsDashboard from './Analytics';
import AnalyticsDashboardSkeleton from './skeletonanalytics';
import useDocumentHeader from '@/hooks/useDocumentTitle';
import { FaCheckCircle } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';
import TourGuide from '@/components/Common/TourGuide';
import { defaultTourStyles } from '@/config/tourStyles';
import { dashboardTourSteps, tourKeys } from '@/constants/toursteps';
import getDomainStatus from '@/utils/getDomainStatus';
import applyStatusClass from '@/utils/applyStatusClass';

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
  useDocumentHeader({ title: t('Common.title.dashboard') });
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

  const [loadDashboard, { data, loading, error }] = useLazyQuery(
    fetchDashboardQuery,
    {
      fetchPolicy: 'cache-first',
      onCompleted: () => setLoadingAnimation(false),
    },
  );
  const [domainStatus, setDomainStatus] = useState<string | undefined>(
    undefined,
  );
  const [statusClass, setStatusClass] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (domain != 'Select a Domain' || domain != 'Add a new Domain') {
      setLoadingAnimation(false);
    }
    if (domain != 'Select a Domain' && domain != 'Add a new Domain') {
      setLoadingAnimation(true);
      loadDashboard({
        variables: { url: domain, startDate, endDate },
      });
    }
  }, [domain, startDate, endDate, loadDashboard]);

  useEffect(() => {
    if (data) {
      setChart(data);
      setUniqueVisitors(data.getSiteVisitorsByURL.count);
      // console.log("data = ",data);
      let combinedProfileCounts: any = {};

      data.getImpressionsByURLAndDate?.impressions.forEach(
        (impression: any) => {
          // Check if profileCounts is not null
          if (impression.profileCounts !== null) {
            // console.log("non null",impression.profileCounts);
            Object.entries(impression.profileCounts).forEach(([key, value]) => {
              combinedProfileCounts[key] =
                (combinedProfileCounts[key] || 0) + value;
            });
          }
        },
      );

      setProfileCounts(combinedProfileCounts);

      const impressionsOutput = data.getImpressionsByURLAndDate?.impressions;
      // console.log(data);
      let wC = 0;
      let wO = 0;
      let i = 0;
      if (impressionsOutput?.length > 0) {
        impressionsOutput.forEach((imp: any) => {
          if (imp.widget_opened) {
            wO += 1;
          }
          if (imp.widget_closed) {
            wC += 1;
          }
          i += 1;
        });
      }
      setWidgetOpened(wO);
      setWidgetClosed(wC);
      setImpressions(i);
    }
  }, [data]);

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
        steps={dashboardTourSteps}
        tourKey={tourKeys.dashboard}
        autoStart={true}
        onTourComplete={handleTourComplete}
        customStyles={defaultTourStyles}
      />

      {loadingAnimation ? (
        <>
          <div className="flex flex-col items-center justify-center w-full mb-8 pl-0 pr-3"></div>
          <AnalyticsDashboardSkeleton />
        </>
      ) : (
        <>
          {/* {domainData ? (
            <div className="flex gap-3">
              <p
                className={`p-1.5 text-xs font-semibold rounded w-fit whitespace-no-wrap ${statusClass}`}
              >
                {domainStatus}
              </p>
              {domainStatus != 'Life Time' && (
                <p className="text-gray-900 whitespace-no-wrap">
                  {domainData?.expiredAt
                    ? new Date(
                        parseInt(domainData?.expiredAt),
                      ).toLocaleString() ?? '-'
                    : '-'}
                </p>
              )}
            </div>
          ) : (
            <p>-</p>
          )} */}

          <div className="w-full py-4">
            <div className="flex flex-col items-center justify-center w-full mb-4 px-4">
              <div className="w-full mb-3 flex">
                <div className="dashboard-welcome-banner w-full grid grid-cols-1 lg:grid-cols-2 text-white rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-gradient-to-br from-[#05203B] via-[#0A3E66] to-[#00B7C2] min-h-[260px] sm:min-h-[300px] md:min-h-[360px]">
                  {/* Left Column - Content */}
                  <div className="px-6 sm:px-8 md:px-10 py-8 md:py-10 h-full flex flex-col justify-center items-center md:items-start space-y-4 md:space-y-6 text-center md:text-left">
                    <div className="space-y-6">
                      <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl  leading-tight tracking-tight">
                        Design for Everyone
                      </h1>
                      <p className="text-base sm:text-lg md:text-xl font-normal leading-relaxed opacity-90 max-w-md">
                        Achieve seamless ADA & WCAG compliance effortlessly with
                        WebAbility
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-row flex-wrap items-center justify-center md:justify-start gap-3 pt-4">
                      <button
                        className="get-compliant-button px-5 py-2 sm:px-6 sm:py-2.5 text-white text-sm sm:text-base md:text-lg rounded-full bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-sm transition-all duration-300 shadow-lg"
                        onClick={handleRedirect}
                      >
                        Get compliant
                      </button>

                      <button
                        className="app-sumo-button px-5 py-2 sm:px-6 sm:py-2.5 text-white/90 text-sm sm:text-base md:text-lg rounded-full bg-transparent hover:bg-white/10 border border-white/30 backdrop-blur-sm transition-all duration-300 shadow-lg"
                        onClick={handleRedirect}
                      >
                        Redeem AppSumo
                      </button>
                    </div>
                  </div>

                  {/* Right Column - Feature Cards */}
                  <div className="relative px-6 md:px-10 py-6 md:py-10 mt-6 lg:mt-0 h-full flex flex-col justify-center items-center overflow-hidden">
                    <div className="w-full max-w-md space-y-4">
                      <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-b from-white/90 to-white/70 text-gray-900 shadow-xl backdrop-blur-md border border-white/60">
                        <h3 className="text-xl font-semibold">
                          Adaptive AI Enhancements
                        </h3>
                        <p className="mt-2 text-sm text-gray-700">
                          Auto-adjust text size, contrast, and navigation for
                          all users.
                        </p>
                      </div>

                      <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-b from-white/90 to-white/70 text-gray-900 shadow-xl backdrop-blur-md border border-white/60">
                        <h3 className="text-xl font-semibold">
                          One Click Setup
                        </h3>
                        <p className="mt-2 text-sm text-gray-700">
                          Get up and running in minutes, backed by fast expert
                          support.
                        </p>
                      </div>

                      <div className="rounded-2xl p-4 sm:p-6 opacity-80 bg-gradient-to-b from-white/80 to-white/60 text-gray-900 shadow-lg backdrop-blur-md border border-white/50">
                        <h3 className="text-lg font-semibold">
                          Brand Friendly Customization
                        </h3>
                        <p className="mt-2 text-sm text-gray-700">
                          Match your brand with flexible, accessible styles.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="analytics-dashboard">
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
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};
export default Dashboard;
