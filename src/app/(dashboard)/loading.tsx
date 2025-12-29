export default function DashboardLoading() {
  return (
    <div className="p-6 animate-pulse">
      {/* ヘッダースケルトン */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-200 rounded-lg"></div>
          <div>
            <div className="h-6 w-32 bg-stone-200 rounded mb-2"></div>
            <div className="h-4 w-24 bg-stone-200 rounded"></div>
          </div>
        </div>
        <div className="h-10 w-28 bg-stone-200 rounded-lg"></div>
      </div>
      
      {/* コンテンツスケルトン */}
      <div className="bg-white rounded-lg border border-stone-200 p-4">
        <div className="space-y-4">
          <div className="h-4 w-3/4 bg-stone-200 rounded"></div>
          <div className="h-4 w-1/2 bg-stone-200 rounded"></div>
          <div className="h-4 w-2/3 bg-stone-200 rounded"></div>
          <div className="h-32 w-full bg-stone-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}



