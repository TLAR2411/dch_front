import hasPermission from '@/utils/hasPermission';
import { auth } from '@/utils/auth';
import { getPartHomeRoute } from '@/utils/partHomeRoutes';

export const redirects = [
  // ℹ️ We are redirecting to different pages based on role.
  // NOTE: Role is just for UI purposes. ACL is based on abilities.
  {
    path: "/",
    name: "index",
    redirect: () => {
      return { name: "dashboards" };
    },
  },
  {
    path: "",
    redirect: () => {
      return { name: "dashboards" };
    },
  },
  {
    path: '/english',
    name: 'english',
    redirect: () => {
      return hasPermission('allow-part-english')
        ? getPartHomeRoute('english', auth()?.permissions || [])
        : { name: 'dashboards' }
    },
  },
  {
    path: '/khmer',
    name: 'khmer',
    redirect: () => {
      return hasPermission('allow-part-khmer')
        ? getPartHomeRoute('khmer', auth()?.permissions || [])
        : { name: 'dashboards' }
    },
  },
  {
    path: '/chinese',
    name: 'chinese',
    redirect: () => {
      return hasPermission('allow-part-chinese')
        ? getPartHomeRoute('chinese', auth()?.permissions || [])
        : { name: 'dashboards' }
    },
  },
  {
    path: '/pos',
    name: 'pos',
    redirect: () => {
      return hasPermission('pos-allow-part')
        ? { name: 'pos-dashboards' }
        : { name: 'dashboards' }
    },
  },
  {
    path: '/stock',
    name: 'stock',
    redirect: () => {
      return hasPermission('stock-allow-part')
        ? { name: 'stock-dashboards' }
        : { name: 'dashboards' }
    },
  },
  {
    path: '/admin',
    name: 'admin',
    redirect: () => {
      return hasPermission('allow-part-admin')
        ? getPartHomeRoute('admin', auth()?.permissions || [])
        : { name: 'dashboards' }
    },
  },
  {
    path: '/hr',
    name: 'hr',
    redirect: () => {
      return hasPermission('hr-allow-part')
        ? { name: 'hr-dashboards' }
        : { name: 'dashboards' }
    },
  },
];
export const routes = [

];
