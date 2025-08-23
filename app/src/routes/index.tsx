import Profile from '@/containers/Profile';
import Accessibility from '@/containers/Accessibility/Accessibility';
import { MdBugReport } from 'react-icons/md';
import ProblemReport from '@/containers/ProblemReport/ProblemReport';
import { TbReportSearch } from 'react-icons/tb';
import { MdOutlineGavel, MdOutlineInsights } from 'react-icons/md';
import { FiFile } from 'react-icons/fi';
import ReportView from '@/containers/Accessibility/ReportView';
import StatementGenerator from '@/containers/StatementGenerator/StatementGenerator';
import Users from '@/containers/Users';
import ProofOfEffortToolkit from '@/containers/ProofOfEffortToolkit/ProofOfEffortToolkit';
import AIInsights from '@/containers/AIInsights/AIInsights';
import LicenseOwnerInfo from '@/containers/LicenseOwnerInfo';
import { HiOutlineUser } from 'react-icons/hi';

const routes = [
  {
    path: '/profile',
    name: 'Profile',
    exact: false,
    component: Profile,
    isSidebar: false,
  },
  {
    path: '/license-owner-info',
    name: 'License Owner',
    exact: true,
    component: LicenseOwnerInfo,
    icon: (
      <HiOutlineUser
        className="menu-icon text-white-blue transition-colors duration-200"
        size={25}
        aria-label="License Owner Info navigation icon"
      />
    ),
    isSidebar: true,
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
    name: 'Proof of Effort',
    exact: true,
    component: ProofOfEffortToolkit,
    icon: (
      <FiFile
        className="menu-icon text-white-blue transition-colors duration-200"
        size={25}
        aria-label="Proof of Effort Toolkit navigation icon"
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
    path: '/users',
    name: 'Users',
    exact: true,
    component: Users,
    isSidebar: false,
  },
];

export default routes;
