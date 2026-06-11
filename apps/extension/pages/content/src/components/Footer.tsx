import { useContext } from 'react';

import { ContentContext } from '@/context';
import { DATA_PLATFORMS } from '@chrome-extension/shared/enums';
import { config } from '@chrome-extension/shared';
import { Copyright } from '@chrome-extension/shared/components';

const { APP_VERSION } = config;

export const Footer = () => {
  const { context, setContext } = useContext(ContentContext);

  const { position, platform } = context || {};

  const positionSwitchVisible = platform
    ? [DATA_PLATFORMS.GOOGLE_MAPS, DATA_PLATFORMS.YANDEX_MAPS].includes(platform)
    : false;

  const handlers = {
    onPositionToggle: () => {
      const { position } = context || {};

      setContext({
        ...context,
        position: position === 'right' ? 'left' : 'right',
      });
    },
  };

  return (
    <div className="w-full flex flex-row justify-between text-xxs text-gray-500">
      <span className="text-gray-400">v{APP_VERSION}</span>
      <Copyright />
      <span>
        {positionSwitchVisible && (
          <button className="cursor-pointer" onClick={handlers.onPositionToggle}>
            {position === 'right' ? '⬅️' : '➡️'}
          </button>
        )}
      </span>
    </div>
  );
};
