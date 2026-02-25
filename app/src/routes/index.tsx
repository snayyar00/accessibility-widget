import Profile from '@/containers/Profile';
import Accessibility from '@/containers/Accessibility/Accessibility';
import { MdBugReport } from 'react-icons/md';
import ProblemReport from '@/containers/ProblemReport/ProblemReport';
import { TbReportSearch } from 'react-icons/tb';
import { MdOutlineGavel, MdOutlineInsights } from 'react-icons/md';
import { FiFile, FiShoppingBag } from 'react-icons/fi';
import { MdAnalytics } from 'react-icons/md';
import ReportView from '@/containers/Accessibility/ReportView';
import StatementGenerator from '@/containers/StatementGenerator/StatementGenerator';
import Users from '@/containers/Users';
import ProofOfEffortToolkit from '@/containers/ProofOfEffortToolkit/ProofOfEffortToolkit';
import AIInsights from '@/containers/AIInsights/AIInsights';
import Workspaces from '@/containers/Workspaces';
import Organization from '@/containers/Organization';
import ServiceRequests from '@/containers/ServiceRequests';
import DomainAnalyses from '@/containers/DomainAnalyses/DomainAnalyses';

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
    name: 'Problem reported',
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
    path: '/domain-analyses',
    name: 'Auto-Fixes',
    exact: true,
    component: DomainAnalyses,
    icon: (
      <MdAnalytics
        className="menu-icon text-white-blue transition-colors duration-200"
        size={30}
        aria-label="Auto-Fixes navigation icon"
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
    path: '/proof-of-effort-toolkit',
    name: 'Legal resources',
    exact: true,
    component: ProofOfEffortToolkit,
    icon: (
      <FiFile
        className="menu-icon text-white-blue transition-colors duration-200"
        size={25}
        aria-label="Legal resources navigation icon"
      />
    ),
    isSidebar: true,
  },
  {
    path: '/service-requests',
    name: 'Service Requests',
    exact: true,
    component: ServiceRequests,
    icon: (
      <FiShoppingBag
        className="menu-icon text-white-blue transition-colors duration-200"
        size={25}
        aria-label="Service Requests navigation icon"
      />
    ),
    isSidebar: true,
  },
  {
    path: '/ai-insights',
    name: 'AI Insights',
    exact: true,
    component: AIInsights,
    beta: true,
    icon: (
      <MdOutlineInsights
        className="menu-icon text-white-blue transition-colors duration-200"
        size={25}
        aria-label="AI Insights navigation icon"
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
  {
    path: '/workspaces',
    name: 'Workspaces',
    exact: true,
    component: Workspaces,
    isSidebar: false,
  },
  {
    path: '/users',
    name: 'Users',
    exact: true,
    component: Users,
    isSidebar: false,
  },
  {
    path: '/organization',
    name: 'Organization',
    exact: true,
    component: Organization,
    isSidebar: false,
  },
];

export default routes;
