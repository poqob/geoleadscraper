import { config } from './../../config';

const { APP_NAME, HOME_PAGE_URL } = config;

export const Copyright = () => (
  <span>
    Powered by{' '}
    <a href={HOME_PAGE_URL} target="_blank" rel="noreferrer" className="text-semibold underline capitalize">
      {APP_NAME}
    </a>
  </span>
);
