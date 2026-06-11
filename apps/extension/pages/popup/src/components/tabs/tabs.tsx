import type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps } from '@radix-ui/react-tabs';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import './tabs.css';

const Tabs = () => <></>;

const TabsRoot = (props: TabsProps) => <TabsPrimitive.Root className="tabs-root" {...props} />;

const TabsList = (props: TabsListProps) => <TabsPrimitive.List className="tabs-list" {...props} />;

const TabsTrigger = (props: TabsTriggerProps) => <TabsPrimitive.Trigger className="tabs-trigger" {...props} />;

const TabsContent = (props: TabsContentProps) => <TabsPrimitive.Content className="tabs-content" {...props} />;

Tabs.Root = TabsRoot;
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

export { Tabs };
