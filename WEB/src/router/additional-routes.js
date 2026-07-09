import hasPermission from '@/utils/hasPermission';

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
      // return { name: 'english-dashboard' }
      return hasPermission('allow-part-english')
        ? { name: 'english-dashboard' }
        : { name: 'dashboards' }
    },
  },
  {
    path: '/khmer',
    name: 'khmer',
    redirect: () => {
      // return { name: 'khmer-dashboard' }
      return hasPermission('allow-part-khmer')
        ? { name: 'khmer-dashboard' }
        : { name: 'dashboards' }
    },
  },
  {
    path: '/chinese',
    name: 'chinese',
    redirect: () => {
      // return { name: 'chinese-dashboard' }
      return hasPermission('allow-part-chinese')
        ? { name: 'chinese-dashboard' }
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
      return hasPermission('admin-allow-part')
        ? { name: 'admin-dashboards' }
        : { name: 'dashboards' }
    },
  },
  {
    path: '/accounting',
    name: 'accounting',
    redirect: () => {
      return hasPermission('accounting-allow-part')
        ? { name: 'accounting-dashboards' }
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
