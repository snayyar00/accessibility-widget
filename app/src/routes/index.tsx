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
import ReportView from '@/containers/Accessibility/ReportView';

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
    path:'/accessibility-test',
    name:'Accessibility',
    exact:true,
    component: Accessibility,
    icon: <FaUniversalAccess className="menu-icon text-white-blue transition-colors duration-200" size={30}/>,
    isSidebar:true,
  },
  {
    path:'/problem-reports',
    name:'Reports',
    exact:true,
    component: ProblemReport,
    icon: <MdBugReport className="menu-icon text-white-blue transition-colors duration-200" size={35}/>,
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
