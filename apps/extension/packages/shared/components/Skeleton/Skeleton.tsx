export const Skeleton = () => (
  <div role="status" className="max-w-sm animate-pulse flex flex-col gap-4">
    <div className="h-4 bg-gray-100 rounded-full dark:bg-gray-300 w-48"></div>
    <div className="h-4 bg-gray-100 rounded-full dark:bg-gray-300 max-w-[360px]"></div>
    <div className="h-4 bg-gray-100 rounded-full dark:bg-gray-300"></div>
  </div>
);
