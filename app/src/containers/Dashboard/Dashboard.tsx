import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import fetchDashboardQuery from '@/queries/dashboard/fetchDashboardQuery';
import { useLazyQuery, useQuery } from '@apollo/client';
import './Dashboard.css';
import TrialBannerAndModal from './TrialBannerAndModal';
import AnalyticsDashboard from './Analytics';
import AnalyticsDashboardSkeleton from './skeletonanalytics';
import useDocumentHeader from '@/hooks/useDocumentTitle';


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
  trial?:number;
}


const Dashboard: React.FC<any> = ({ domain, domainData,allDomains,setReloadSites,customerData }: any) => {
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
  const [profileCounts,setProfileCounts] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const [paymentView, setPaymentView] = useState(false);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  const getStartOfWeek = () => {
    const currentDate = new Date();
    const firstDayOfWeek = currentDate.getDate() - currentDate.getDay() + (currentDate.getDay() === 0 ? -6 : 1);
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), firstDayOfWeek).toISOString().split('T')[0];
  };

  const getStartOfYear = () => {
    const currentDate = new Date();
    return new Date(currentDate.getFullYear(), 0, 1).toISOString().split('T')[0];
  };

  const getStartOfMonth = () => {
    const currentDate = new Date();
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
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
        }))
      );
    } else {
      // Populate chart data with 0 values for each date in the date range
      const dateRange = generateDateRange(startDate!, endDate!);
      setChartData(dateRange.map((date) => ({
        date,
        engagement: 0,
        impressions: 0,
      }))
      );
    }
  }

  const today       = new Date();
  const defaultEnd  = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 2
  ).toISOString().slice(0, 10);

  const defaultStart = (() => {
    const d = new Date();
    const firstDay = d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), firstDay)
      .toISOString()
      .slice(0,10);
  })();

  const [startDate, setStartDate] = useState<string>(defaultStart);
  const [endDate, setEndDate]     = useState<string>(defaultEnd);

  const [loadDashboard, { data, loading, error }] = useLazyQuery(fetchDashboardQuery, {
    fetchPolicy: 'cache-first',
    onCompleted: () => setLoadingAnimation(false),
  });
  
  useEffect(() => {
    setLoadingAnimation(true);
    loadDashboard({
      variables: { url: domain, startDate, endDate },
    });
  }, [domain, startDate, endDate, loadDashboard]);

  useEffect(() => {
    if (data) {
      setChart(data);
      setUniqueVisitors(data.getSiteVisitorsByURL.count);
      // console.log("data = ",data);
      let combinedProfileCounts:any = {};

      data.getImpressionsByURLAndDate?.impressions.forEach((impression:any) => {
        // Check if profileCounts is not null
        if (impression.profileCounts !== null) {
            // console.log("non null",impression.profileCounts);
            Object.entries(impression.profileCounts).forEach(([key, value]) => {
                combinedProfileCounts[key] = (combinedProfileCounts[key] || 0) + value;
            });
        }
    });
    
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
        })
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
        heading: 'Unique Visitors',
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

  const applyStatusClass = (status: string): string => {
    if (!status) {
      return 'bg-yellow-200 text-200';
    }
    const currentTime = new Date().getTime();
    const timeDifference = new Date(parseInt(status)).getTime() - currentTime;
    const sevendays = 7 * 24 * 60 * 60 * 1000;

    if (timeDifference > sevendays) {
      return 'bg-green-200 text-green-600';
    }
    if (timeDifference < sevendays && timeDifference > 0) {
      return 'bg-red-200 text-red-600';
    }
    return 'bg-yellow-200 text-200';
  }

  const getDomainStatus = (status: string): string => {
    if (!status) {
      return 'Not Available';
    }
    const currentTime = new Date().getTime();
    const timeDifference = new Date(parseInt(status)).getTime() - currentTime;
    const sevendays = 7 * 24 * 60 * 60 * 1000;

    if (timeDifference > sevendays) {
      return 'Active';
    }
    if (timeDifference < sevendays && timeDifference > 0) {
      return 'Expiring';
    }
    return 'Expired';
  }

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

  return (
    <>
      {loadingAnimation ? (
        <><div className="flex flex-col items-center justify-center w-full mb-8 pl-0 pr-3">
        </div><AnalyticsDashboardSkeleton/></>
      ):(
      <>{domainData ? (
        <div className="flex gap-3">
          <p
            className={`p-1.5 text-xs font-semibold rounded w-fit whitespace-no-wrap ${applyStatusClass(
              domainData.expiredAt,
            )}`}
          >
            {getDomainStatus(domainData.expiredAt)}
          </p>
          <p className="text-gray-900 whitespace-no-wrap">
            {domainData.expiredAt
              ? new Date(parseInt(domainData.expiredAt)).toLocaleString() ?? '-'
              : '-'}
          </p>
        </div>
      ) : (
        <p>-</p>
      )}
     
        <div className="container py-4">
          <div className="flex flex-col items-center justify-center w-full mb-8 pl-0 pr-3">
            <TrialBannerAndModal
              allDomains={allDomains}
              setReloadSites={setReloadSites}
              isModalOpen={isModalOpen}
              closeModal={closeModal}
              openModal={openModal}
              paymentView={paymentView}
              setPaymentView={setPaymentView}
              customerData={customerData}
            />
          </div>
          <div>
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
      </>)} 
    </>
  );
};
export default Dashboard;
