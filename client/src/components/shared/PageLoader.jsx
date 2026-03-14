export default function PageLoader() {
  return (
    <div className="flex-1 p-8 space-y-6 animate-fade-in">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="grid grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-6 space-y-3">
            <div className="skeleton h-10 w-10 rounded-xl" />
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-7 w-16 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 card p-6 h-64">
          <div className="skeleton h-5 w-32 rounded mb-4" />
          <div className="skeleton h-full rounded-xl" />
        </div>
        <div className="card p-6 h-64">
          <div className="skeleton h-5 w-24 rounded mb-4" />
          <div className="skeleton h-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
