export default function FacilitiesLoading() {
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
      
      {/* 施設リスト */}
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="h-6 w-40 bg-stone-200 rounded mb-3"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-stone-200 rounded"></div>
              <div className="h-4 w-3/4 bg-stone-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



