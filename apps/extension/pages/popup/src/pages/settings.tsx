import { useEffect, useState } from 'react';

import { useStore } from '@chrome-extension/shared/hooks';

import { RadioGroup, Switch, Tabs, ToggleGroup } from './../components';
import {
  DATA_EXPORT_FIELDS_SELECT,
  DATA_EXPORT_FORMATS_SELECT,
} from '@chrome-extension/shared/enums';

const TABS = {
  GENERAL: 'general',
  EXPORT: 'export',
};

const data = {
  select: {
    export: DATA_EXPORT_FORMATS_SELECT,
    exportFields: DATA_EXPORT_FIELDS_SELECT,
  },
};

const Page = () => {
  return (
    <div>
      <Tabs.Root defaultValue={TABS.GENERAL}>
        <Tabs.List>
          <Tabs.Trigger value={TABS.GENERAL}>Settings</Tabs.Trigger>
          <Tabs.Trigger value={TABS.EXPORT}>Export</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value={TABS.GENERAL}>
          <SettingsGeneralView />
        </Tabs.Content>
        <Tabs.Content value={TABS.EXPORT}>
          <SettingsExportView />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

const SettingsGeneralView = () => {
  const store = useStore();

  const {
    export_format,
    auto_download,
    backend_url,
    enrich_missing,
    discover_query,
    discover_grid_size,
  } = store.state || {};

  const [discoverQuery, setDiscoverQuery] = useState(discover_query || '');

  useEffect(() => {
    if (discover_query !== undefined) {
      setDiscoverQuery(discover_query);
    }
  }, [discover_query]);

  const handlers = {
    onFormatChange: (format: string) => {
      store.update(state => ({ ...state, export_format: format }));
    },
    onDownloadChange: (download: boolean): void => {
      store.update(state => ({ ...state, auto_download: download }));
    },
    onEnrichMissingChange: (enrich: boolean): void => {
      store.update(state => ({ ...state, enrich_missing: enrich }));
    },
    onBackendChange: (url: string): void => {
      store.update(state => ({ ...state, backend_url: url.trim() }));
    },
    onDiscoverQueryChange: (query: string): void => {
      store.update(state => ({ ...state, discover_query: query.trim() }));
    },
    onDiscoverGridSizeChange: (gridSize: number): void => {
      store.update(state => ({ ...state, discover_grid_size: gridSize }));
    },
  };

  return (
    <div className="flex flex-col gap-4 text-neutral-700 text-sm">
      <div>
        <span>1. Auto download the list after extracting complete.</span>
        <div className="mt-2">
          <Switch checked={auto_download} onCheckedChange={handlers.onDownloadChange} />
        </div>
      </div>
      <div>
        <span>2. The format used for exporting data.</span>
        <div className="mt-2">
          <RadioGroup.Root
            className="flex flex-row gap-3"
            value={export_format}
            onValueChange={handlers.onFormatChange}>
            {data.select.export.map(({ label, value }, key) => (
              <RadioGroup.Item key={key} id={value} value={value} label={label} />
            ))}
          </RadioGroup.Root>
        </div>
      </div>
      <div>
        <span>3. Enrich missing email / phone from websites (before export).</span>
        <div className="mt-2">
          <Switch checked={enrich_missing} onCheckedChange={handlers.onEnrichMissingChange} />
        </div>
      </div>
      <div>
        <span>4. Backend URL (optional) — enables website contact enrichment.</span>
        <input
          type="text"
          spellCheck={false}
          placeholder="http://localhost:5050"
          defaultValue={backend_url || ''}
          onBlur={e => handlers.onBackendChange(e.target.value)}
          className="mt-2 w-full rounded border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-500"
        />
        <p className="mt-1 text-xs text-neutral-500">
          The extension extracts contacts directly inside your browser. Optional: you can connect a local Puppeteer backend for advanced JS rendering.
        </p>
      </div>
      <div>
        <span>5. Discover Area search keywords (optional).</span>
        <input
          type="text"
          spellCheck={false}
          placeholder="e.g. firmalar, sanayi, restoran, tekstil..."
          value={discoverQuery}
          onChange={e => setDiscoverQuery(e.target.value)}
          onBlur={e => handlers.onDiscoverQueryChange(e.target.value)}
          className="mt-2 w-full rounded border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-500"
        />
        <p className="mt-1 text-xs text-neutral-500">
          Keywords queried in the background during Area Discovery. Leave empty to automatically discover all businesses in the map view.
        </p>
      </div>
      <div>
        <span>6. Discover Area grid size.</span>
        <div className="mt-2">
          <RadioGroup.Root
            className="flex flex-row gap-3"
            value={String(discover_grid_size || 4)}
            onValueChange={(val: string) => handlers.onDiscoverGridSizeChange(Number(val))}>
            <RadioGroup.Item id="grid-3" value="3" label="3x3 (9 tiles)" />
            <RadioGroup.Item id="grid-4" value="4" label="4x4 (16 tiles)" />
            <RadioGroup.Item id="grid-6" value="6" label="6x6 (36 tiles)" />
          </RadioGroup.Root>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Scanning density around your current map view (4x4 is recommended).
        </p>
      </div>
    </div>
  );
};

interface IExportFieldItem {
  value: string;
  checked: boolean;
  label: string;
}

const SettingsExportView = () => {
  const store = useStore();
  const [items, setItems] = useState<IExportFieldItem[]>([]);

  const handleSelect = (items: IExportFieldItem[]) => {
    setItems(() => items);
    const fields = items.filter(({ checked }) => checked).map(({ value }) => value);
    store.update(state => ({ ...state, export_fields: fields }));
  };

  useEffect(() => {
    if (!store.state) return;
    const fields: string[] = store.state?.export_fields || [];
    setItems(() =>
      data.select.exportFields.map(item => ({ ...item, checked: fields.some(field => field === item.value) })),
    );
  }, [store.state]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <span className="text-sm">Click to select / unselect what you want to export.</span>
        <p className="mt-1 text-xs text-neutral-500">
          Email, phone and social links are automatically enriched from business websites before export.
        </p>
        <div className="mt-2">
          <ToggleGroup items={items} filter={items => items} onChange={handleSelect} />
        </div>
      </div>
    </div>
  );
};

export default Page;
