import React from 'react';
import Dashboard from '@/containers/Dashboard';
import Profile from '@/containers/Profile';
import Document from '@/containers/Document';
import ActionDocument from '@/containers/Document/Action';
import ViewDocument from '@/containers/Document/View';
import Teams from '@/containers/Teams';
import { ReactComponent as DashboardIcon } from '@/assets/images/svg/dashboard.svg';
import { ReactComponent as DocumentIcon } from '@/assets/images/svg/document.svg';
import { ReactComponent as UserIcon } from '@/assets/images/svg/user.svg';
import {} from '@/containers/Dashboard/CustomChart';
import Accessibility from '@/containers/Accessibility/Accessibility';
import { ReactComponent as AccessibilityIcon} from '@/assets/images/svg/Accessibility.svg';
import { MdBugReport } from 'react-icons/md';
import ProblemReport from '@/containers/ProblemReport/ProblemReport';
import { FaUniversalAccess } from 'react-icons/fa';
import { TbReportSearch } from 'react-icons/tb';
import { HiOutlineDocumentText } from 'react-icons/hi';
import { MdOutlineGavel } from 'react-icons/md';
import ReportView from '@/containers/Accessibility/ReportView';
import StatementGenerator from '@/containers/StatementGenerator/StatementGenerator';

const routes = [
  // {
  //   path: '/dashboard',
  //   name: 'Dashboard',
  //   exact: false,
  //   component:Dashboard,
  //   icon: <DashboardIcon />,
  //   isSidebar: true,
  // },
  // {
  //   path: '/document',
  //   name: 'Document',
  //   exact: true,
  //   component: Document,
  //   icon: <DocumentIcon />,
  //   isSidebar: true,
  // },
  // {
  //   path: '/add-domain',
  //   name: 'Add Domain',
  //   exact: false,
  //   component: Teams,
  //   icon: <UserIcon />,
  //   isSidebar: true,
  // },
  {
    path: '/document/create',
    name: 'Create Document',
    exact: true,
    component: ActionDocument,
    isSidebar: false,
  },
  {
    path: '/document/edit/:id',
    name: 'Edit Document',
    exact: true,
    component: ActionDocument,
    isSidebar: false,
  },
  {
    path: '/document/view/:id',
    name: 'View Document',
    exact: true,
    component: ViewDocument,
    isSidebar: false,
  },
  {
    path: '/profile',
    name: 'Profile',
    exact: false,
    component: Profile,
    isSidebar: false,
  },
  {
    path:'/scanner',
    name:'Scanner',
    exact:true,
    component: Accessibility,
    icon: <TbReportSearch className="menu-icon text-white-blue transition-colors duration-200" size={30} aria-label="Scanner navigation icon"/>,
    isSidebar:true,
  },
  {
    path:'/problem-reports',
    name:'Issues',
    exact:true,
    component: ProblemReport,
    icon: <MdBugReport className="menu-icon text-white-blue transition-colors duration-200" size={35} aria-label="Issues navigation icon"/>,
    isSidebar:true,
  },
  {
    path:'/statement-generator',
    name:'AI Statement',
    exact:true,
    component: StatementGenerator,
    icon: <MdOutlineGavel className="menu-icon text-white-blue transition-colors duration-200" size={30} aria-label="AI Statement Generator navigation icon"/>,
    isSidebar:true,
  },
  {
    path: '/reports/:r2_key',
    name: 'Report View',
    exact: true,
    component: ReportView, // Use the new ReportView component
    isSidebar: false,
  }
];

export default routes;
