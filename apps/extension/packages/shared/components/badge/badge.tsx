interface IBadgeProps {
  children: React.ReactNode;
}

export const Badge: React.FC<IBadgeProps> = ({ children }) => {
  return <div className="badge">{children}</div>;
};
