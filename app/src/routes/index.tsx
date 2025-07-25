import Profile from '@/containers/Profile';
import Accessibility from '@/containers/Accessibility/Accessibility';
import { MdBugReport } from 'react-icons/md';
import ProblemReport from '@/containers/ProblemReport/ProblemReport';
import { TbReportSearch } from 'react-icons/tb';
import { MdOutlineGavel } from 'react-icons/md';
import ReportView from '@/containers/Accessibility/ReportView';
import StatementGenerator from '@/containers/StatementGenerator/StatementGenerator';

const routes = [
  {
    path: '/profile',
    name: 'Profile',
    exact: false,
    component: Profile,
    isSidebar: false,
  },
  {
    path: '/scanner',
    name: 'Scanner',
    exact: true,
    component: Accessibility,
    icon: (
      <TbReportSearch
        className="menu-icon text-white-blue transition-colors duration-200"
        size={30}
        aria-label="Scanner navigation icon"
      />
    ),
    isSidebar: true,
  },
  {
    path: '/problem-reports',
    name: 'Issues',
    exact: true,
    component: ProblemReport,
    icon: (
      <MdBugReport
        className="menu-icon text-white-blue transition-colors duration-200"
        size={35}
        aria-label="Issues navigation icon"
      />
    ),
    isSidebar: true,
  },
  {
    path: '/statement-generator',
    name: 'AI Statement',
    exact: true,
    component: StatementGenerator,
    icon: (
      <MdOutlineGavel
        className="menu-icon text-white-blue transition-colors duration-200"
        size={30}
        aria-label="AI Statement Generator navigation icon"
      />
    ),
    isSidebar: true,
  },
  {
    path: '/reports/:r2_key',
    name: 'Report View',
    exact: true,
    component: ReportView,
    isSidebar: false,
  },
];

export default routes;
