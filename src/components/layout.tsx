import Header from './header';

export interface ChildrenProps {
  children: React.ReactNode;
}

const Layout: React.FC<ChildrenProps> = ({ children }) => {
  return (
    <div className="max-w-[84%] mx-auto">
      <Header />
      <div className="mt-4">{children}</div>
    </div>
  );
};

export default Layout;
