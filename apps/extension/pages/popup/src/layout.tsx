import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { PiGearBold, PiHouseBold, PiQuestionBold } from 'react-icons/pi';

import { config, Logo } from '@chrome-extension/shared';

import { ROUTER } from './router';

export interface ILayoutProps {
  children?: JSX.Element;
}

const navigation = {
  links: [
    {
      href: ROUTER.HOME,
      icon: PiHouseBold,
    },
    {
      href: '',
      icon: PiQuestionBold,
      click: () => {
        chrome.tabs.create({ url: config.FAQ_URL });
      },
    },
    {
      href: ROUTER.SETTINGS,
      icon: PiGearBold,
    },
  ],
};

const { APP_VERSION } = config;

export const Layout: React.FC<ILayoutProps> = ({ children }) => {
  return (
    <div className="app">
      <header className="app-header border-b flex flex-col justify-center border-neutral-200">
        <div className="container flex flex-row justify-between items-center gap-4">
          <Logo size="sm" />
          <nav className="basis-full flex flex-row items-center justify-end">
            <div className="flex flex-row gap-2 items-center justify-end text-lg text-black">
              {navigation.links?.map(({ href, icon: Icon, click }, key) => (
                <Link
                  key={key}
                  to={href || '#'}
                  className="transition-all p-1 aspect-square hover:bg-neutral-100 rounded"
                  onClick={click}>
                  <Icon size={18} />
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </header>
      <main className="container flex flex-col py-2">{children}</main>
      <footer className="app-footer w-full flex flex-row justify-center items-center">
        <span className="text-xs font-medium text-neutral-500">v{APP_VERSION}</span>
      </footer>
    </div>
  );
};
