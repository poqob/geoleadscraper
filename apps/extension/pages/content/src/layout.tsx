import { Footer } from './components';

type LayoutProps = {
  children: React.ReactNode;
};

export const Layout: React.FC<LayoutProps> = ({ children }) => (
  <div className="w-full flex flex-col p-2">
    {children}
    <div className="w-full mt-8">
      <Footer />
    </div>
  </div>
);
