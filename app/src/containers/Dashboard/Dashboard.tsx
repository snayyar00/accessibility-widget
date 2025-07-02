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
  const history = useHistory();


  const handleRedirect = () => {
    history.push('/add-domain?open-modal=true');
  }

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

  const [appSumoDomains,setAppSumoDomain] = useState<string[]>([]);
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


  useEffect(() => {
  
    if(customerData?.subscriptions){
      const appSumoDomains:any = [];
      let subs = JSON.parse(customerData.subscriptions);
      // console.log("subs = ",subs);
      ['monthly', 'yearly'].forEach((subscriptionType) => {
          // Loop over each subscription in the current type (monthly or yearly)
          subs[subscriptionType].forEach((subscription:any) => {
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
        <><div className="flex flex-col items-center justify-center w-full mb-8 pl-0 pr-3">
        </div><AnalyticsDashboardSkeleton/></>
      ):(
      <>{domainData ? (
        <div className="flex gap-3">
          <p
            className={`p-1.5 text-xs font-semibold rounded w-fit whitespace-no-wrap ${applyStatusClass(
              domainData.domain,
              domainData.expiredAt,
              domainData.trial,
              appSumoDomains,
            )}`}
          >
            {getDomainStatus(
              domainData.domain,
              domainData.expiredAt,
              domainData.trial,
              appSumoDomains 
            )}
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
  <div className="w-full mb-6 flex">
    <div
      className="dashboard-welcome-banner w-full grid grid-cols-1 lg:grid-cols-12 text-white rounded-xl overflow-hidden shadow-2xl transform hover:scale-[1.01] transition-transform duration-300"
      style={{ backgroundColor: 'rgb(0 51 237)' }}
    >
      {/* Left Column */}
      <div className="col-span-full xl:col-span-7 px-6 py-6 flex flex-col justify-center space-y-4">
        <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
          Empower Every Visitor with Inclusive Design
        </h1>
        <p className="text-base lg:text-lg">
          Achieve seamless ADA & WCAG compliance effortlessly with WebAbility's
          AI-driven accessibility toolkit.
        </p>

        {/* Features Card */}
        <div className="bg-white/10 p-4 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              title: 'Comprehensive Standards',
              desc: 'Fully aligned with ADA, WCAG, and international guidelines.',
            },
            {
              title: 'Instant One-Click Setup',
              desc: 'Get up and running in minutes, backed by fast expert support.',
            },
            {
              title: 'Adaptive AI Enhancements',
              desc: 'Auto-adjust text size, contrast, and navigation for all users.',
            },
            {
              title: 'Brand-Friendly Customization',
              desc: 'Style the widget to perfectly match your site\'s look and feel.',
            },
          ].map((item) => (
            <div key={item.title} className="flex items-start space-x-2">
              <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <FaCheckCircle className="text-white w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-sm">{item.title}</h3>
                <p className="text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column (Image) */}
      <div className="hidden xl:flex xl:col-span-5 items-center justify-center p-6">
        <img
          src="https://www.webability.io/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fsection_1_right.bf6223d4.png&w=750&q=75"
          alt="Graphic showing increase in accessibility score"
          className="max-w-full max-h-full object-contain"
        />
      </div>
      {/* Call‑to‑Action Buttons */}
      <div className="col-span-full bg-white/5 py-4 flex flex-row sm:flex-col gap-8 justify-center px-6">
        <button
          className="get-compliant-button flex-1 py-4 text-white font-bold text-xl rounded-xl bg-primary hover:bg-sapphire-blue transition-colors duration-300"
          onClick={handleRedirect}
        >
          Get Compliant
        </button>
        
          <button
            className="app-sumo-button flex-1 py-4 text-black font-bold text-xl rounded-xl bg-[#ffbc00] hover:bg-yellow-600 transition-colors duration-300"
            onClick={handleRedirect}
          >
            Redeem App Sumo
          </button>
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
      </>)} 
    </>
  );
};
export default Dashboard;
