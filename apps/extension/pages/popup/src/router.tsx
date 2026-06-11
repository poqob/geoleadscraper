import { lazy, type JSX } from 'react';
import { ILayoutProps } from './layout';

export type RouteObject = {
  path: string;
  element?: React.LazyExoticComponent<React.FC<any>>;
  layout?: React.FC<ILayoutProps>;
  redirect?: string;
  fallback?: JSX.Element;
  private?: boolean;
};

export const ROUTER = {
  HOME: '/',
  SETTINGS: '/settings',
};

export const routes: RouteObject[] = [
  {
    path: '*',
    redirect: ROUTER.HOME,
  },
  {
    path: ROUTER.HOME,
    element: lazy(() => import('./pages/home')),
  },
  {
    path: ROUTER.SETTINGS,
    element: lazy(() => import('./pages/settings')),
  },
];
