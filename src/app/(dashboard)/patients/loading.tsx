export default function PatientsLoading() {
  return (
    <div className="p-6 animate-pulse">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-200 rounded-lg"></div>
          <div>
            <div className="h-7 w-32 bg-stone-200 rounded mb-2"></div>
            <div className="h-4 w-20 bg-stone-200 rounded"></div>
          </div>
        </div>
        <div className="h-10 w-28 bg-stone-200 rounded-lg"></div>
      </div>
      
      {/* フィルター */}
      <div className="flex gap-2 mb-4">
        <div className="h-10 w-20 bg-stone-200 rounded-lg"></div>
        <div className="h-10 w-20 bg-stone-200 rounded-lg"></div>
        <div className="h-10 w-20 bg-stone-200 rounded-lg"></div>
      </div>
      
      {/* 患者リスト */}
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-5 w-32 bg-stone-200 rounded mb-2"></div>
                <div className="h-4 w-48 bg-stone-200 rounded"></div>
              </div>
              <div className="h-8 w-16 bg-stone-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



