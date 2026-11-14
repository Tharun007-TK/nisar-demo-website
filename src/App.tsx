import { useCallback, useEffect, useMemo, useState } from 'react';
import { ErrorState } from './components/ErrorState';
import { ExplainerPanel } from './components/ExplainerPanel';
import { Footer } from './components/Footer';
import { ImpactCards } from './components/ImpactCards';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { MapView } from './components/MapView';
import { RainfallChart } from './components/RainfallChart';
import { TopBar } from './components/TopBar';
import { ValidationCard } from './components/ValidationCard';
import { WardTable } from './components/WardTable';
import { CONFIG } from './lib/config';
import { loadDashboardData, type DashboardData } from './lib/data';
import { computeFeatureBBox, rankTopWards, type BBox, type RankedWard } from './lib/geo';

export default function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reloadSeq, setReloadSeq] = useState<number>(0);

  const [hoveredWardName, setHoveredWardName] = useState<string | null>(null);
  const [selectedWardName, setSelectedWardName] = useState<string | null>(null);
  const [zoomTargetBBox, setZoomTargetBBox] = useState<BBox | null>(null);
  const [zoomSeq, setZoomSeq] = useState<number>(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    loadDashboardData(CONFIG.DATA_BASE_PATH, controller.signal)
      .then((loaded) => {
        setData(loaded);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unknown error loading dashboard data.');
        setLoading(false);
      });

    return () => controller.abort();
  }, [reloadSeq]);

  const topWards = useMemo(() => {
    if (!data) return [];
    return rankTopWards(data.wards, 10);
  }, [data]);

  const handleSelectWardFromTable = useCallback((ward: RankedWard) => {
    setSelectedWardName(ward.name);
    setZoomTargetBBox(ward.bbox);
    setZoomSeq((n) => n + 1);
  }, []);

  const handleSelectWardFromMap = useCallback(
    (name: string | null) => {
      setSelectedWardName(name);
      if (name && data) {
        const match = data.wards.features.find((f) => f.properties.name === name);
        if (match) {
          setZoomTargetBBox(computeFeatureBBox(match));
        }
      }
    },
    [data]
  );

  const handleResetWardSelection = useCallback(() => {
    setSelectedWardName(null);
    setHoveredWardName(null);
  }, []);

  const isMock = data?.meta.mock ?? CONFIG.USE_MOCK;

  return (
    <div className="flex min-h-screen flex-col bg-[#07090E] text-slate-100 lg:h-screen lg:overflow-hidden">
      <TopBar meta={data?.meta} />

      {loading && <LoadingSkeleton />}

      {!loading && error && (
        <ErrorState
          message={error}
          onRetry={() => setReloadSeq((prev) => prev + 1)}
        />
      )}

      {!loading && !error && data && (
        <main className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
          {/* Left ~65%: Full-height MapLibre comparison view */}
          <div className="flex min-h-[540px] flex-col border-b border-slate-800 lg:min-h-0 lg:w-[65%] lg:border-b-0 lg:border-r">
            <MapView
              meta={data.meta}
              overlays={data.overlays}
              wards={data.wards}
              hoveredWardName={hoveredWardName}
              selectedWardName={selectedWardName}
              zoomTargetBBox={zoomTargetBBox}
              zoomSeq={zoomSeq}
              onSelectWardByName={handleSelectWardFromMap}
              onHoverWardByName={setHoveredWardName}
              onResetWardSelection={handleResetWardSelection}
            />
          </div>

          {/* Right ~35%: Scrollable Analytical Sidebar */}
          <aside
            aria-label="Flood impact analytics sidebar"
            className="flex flex-col gap-4 bg-[#07090E] p-4 lg:w-[35%] lg:overflow-y-auto"
          >
            <ImpactCards stats={data.stats} isMock={isMock} />

            <WardTable
              wards={topWards}
              hoveredWardName={hoveredWardName}
              selectedWardName={selectedWardName}
              onHoverWard={setHoveredWardName}
              onSelectWard={handleSelectWardFromTable}
            />

            <RainfallChart
              data={data.rainfall}
              preDate={data.meta.preDate}
              postDate={data.meta.postDate}
            />

            <ExplainerPanel />

            <ValidationCard validation={data.stats.validation} isMock={isMock} />
          </aside>
        </main>
      )}

      <Footer isMock={isMock} />
    </div>
  );
}
