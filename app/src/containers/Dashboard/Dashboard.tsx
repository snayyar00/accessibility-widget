import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import fetchDashboardQuery from '@/queries/dashboard/fetchDashboardQuery';
import { useQuery } from '@apollo/client';
import { CircularProgress } from '@mui/material';
import DashboardCard from './DashboardCard';
import ExportButton from './ExportButton';
import DropdownSelector from './DropdownSelector';
import CustomChart from './CustomChart';
import './Dashboard.css';


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



const Dashboard: React.FC<any> = ({ domain }: any) => {

  const [startDate, setStartDate] = useState<string>();
  const [endDate, setEndDate] = useState<string>();
  const [impressions, setImpressions] = useState<number>(0);
  const [widgetClosed, setWidgetClosed] = useState<number>(0);
  const [widgetOpened, setWidgetOpened] = useState<number>(0);
  const [uniqueVisitors, setUniqueVisitors] = useState<number>(0);
  const { t } = useTranslation();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [granularity, setGranularity] = useState<string>('Day');

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
    console.log(data.getEngagementRates);
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

  useEffect(() => {
    const today = new Date();
    today.setDate(today.getDate() + 2);
    const eD = today.toISOString().split('T')[0];
    setEndDate(eD);
    setStartDate(getStartOfWeek());
  }, []);

  const { data, refetch, loading, error } = useQuery(fetchDashboardQuery, { variables: { url: domain, startDate, endDate } });

  useEffect(() => {
    if (data) {
      setChart(data);
      setUniqueVisitors(data.getSiteVisitorsByURLAndDate.count);
      const impressionsOutput = data.getImpressionsByURLAndDate.impressions;
      let wC = 0;
      let wO = 0;
      let i = 0;
      if (impressionsOutput.length > 0) {
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
      {
        id: 4,
        heading: 'Widget Closed',
        count: widgetClosed,
        countType: 'times',
      },
      // ... more card data
    ]);

  }, [widgetClosed, widgetOpened, impressions, uniqueVisitors]);

  useEffect(() => {
    refetch();
  }, [domain]);


  useEffect(() => {
    setCards((currentCards) =>
      currentCards.map((card) => ({
        ...card,
      })),
    );
  }, [granularity]);

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
      {loading && <div className='flex items-center justify-center h-screen w-screen'><CircularProgress size={150} /></div>}
      {!loading &&
        <div className="container">
          {/* Dropdown, Plus Button, and ExportButton */}
          <div className="ml-4 flex gap-4 mb-4">
            <button
              type="button"
              className="button-class mt-5"
              onClick={() => console.log('Button clicked')}
              aria-label="Add"
            >
              {/* SVG for plus button */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
            </button>

            <ExportButton />
            {/* <DropdownSelector granularity={granularity} setGranularity={setGranularity} /> */}
            <DropdownSelector
              granularity={granularity}
              onGranularityChange={setGranularity}
              setStartDate={setStartDate}
              weekStart={getStartOfWeek()}
              monthStart={getStartOfMonth()}
              yearStart={getStartOfYear()}
              refetch={() => { console.log('refetch'); refetch() }}
            />
          </div>

          {/* Cards Section */}

          <div className="pl-10 cards-row">
            {/* Render first row of DashboardCards */}
            {/* <div className="cards-row flex"> */}
            {cards.slice(0, 4).map((card) => (
              <DashboardCard
                key={card.id}
                heading={card.heading}
                count={card.count}
                countType={card.countType}
              />
            ))}
            {/* </div> */}
            {/* Render second row of DashboardCards */}
            {/* <div className="cards-row flex"> */}
            {cards.slice(4, 9).map((card) => (
              <DashboardCard
                key={card.id}
                heading={card.heading}
                count={card.count}
                countType={card.countType}
              />
            ))}
            {/* </div> */}
          </div>

          <div>
            <CustomChart data={chartData} />
          </div>
        </div>
      }
    </>
  );
};
export default Dashboard;
