export default function CalendarLoading() {
  return (
    <div className="p-6 animate-pulse">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-200 rounded-lg"></div>
          <div className="h-7 w-40 bg-stone-200 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-stone-200 rounded-lg"></div>
          <div className="h-10 w-24 bg-stone-200 rounded-lg"></div>
        </div>
      </div>
      
      {/* カレンダーグリッド */}
      <div className="bg-white rounded-lg border border-stone-200 p-4">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-8 bg-stone-200 rounded"></div>
          ))}
        </div>
        
        {/* カレンダー日付 */}
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="h-24 bg-stone-100 rounded border border-stone-200"></div>
          ))}
        </div>
      </div>
    </div>
  );
}



