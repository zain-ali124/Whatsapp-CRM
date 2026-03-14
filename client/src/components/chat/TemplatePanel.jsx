import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { templateApi } from '../../api/templateApi';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'all', label: 'All', icon: 'grid_view' },
  { value: 'greeting', label: 'Greeting', icon: 'waving_hand' },
  { value: 'follow_up', label: 'Follow-up', icon: 'replay' },
  { value: 'closing', label: 'Closing', icon: 'handshake' },
  { value: 'reminder', label: 'Reminder', icon: 'alarm' },
  { value: 'promotion', label: 'Promotion', icon: 'local_offer' },
  { value: 'support', label: 'Support', icon: 'support_agent' },
  { value: 'custom', label: 'Custom', icon: 'edit_note' },
];

const CAT_COLORS = {
  greeting: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  follow_up: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  closing: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  reminder: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  promotion: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
  support: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  custom: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

function TemplateCard({ template, onSelect }) {
  const [showPreview, setShowPreview] = useState(false);
  const bodyText = template.body || '';
  const cat = template.category || 'custom';
  const categoryColor = CAT_COLORS[cat] || CAT_COLORS.custom;
  const categoryIcon = CATEGORIES.find(c => c.value === cat)?.icon || 'description';

  // Preview first 100 characters
  const previewText = bodyText.length > 100
    ? bodyText.substring(0, 100) + '...'
    : bodyText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative"
    >
      <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onSelect(template)}
          className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors shadow-lg"
          title="Use this template"
        >
          <span className="material-symbols-outlined text-[16px]">send</span>
        </button>
      </div>

      <div 
        className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
        onClick={() => onSelect(template)}
      >
        <div className="flex items-start gap-2 mb-2">
          <div className={`p-1.5 rounded-lg ${categoryColor}`}>
            <span className="material-symbols-outlined text-[14px]">{categoryIcon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                {template.name}
              </h4>
              {template.isFavourite && (
                <span className="material-symbols-outlined text-[12px] text-amber-400 fill-current">star</span>
              )}
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${categoryColor}`}>
              {cat.replace('_', ' ')}
            </span>
          </div>
        </div>

        <AnimatePresence>
          {showPreview ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg mt-2"
            >
              {bodyText}
            </motion.div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {previewText}
            </p>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">send</span>
            <span>{template.usageCount || 0} used</span>
          </div>
          <div className="flex items-center gap-1">
            {template.variables?.length > 0 && (
              <>
                <span className="material-symbols-outlined text-[12px]">data_object</span>
                <span>{template.variables.length} vars</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function TemplatePanel({ onSelectTemplate, onClose }) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showFavourites, setShowFavourites] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['templates-panel', category, search, showFavourites],
    queryFn: () => templateApi.getAll({
      ...(category !== 'all' && { category }),
      ...(search && { search }),
      ...(showFavourites && { favourite: true }),
    }).then(r => r.data),
  });

  const templates = data?.templates || [];

  const handleSelect = (template) => {
    onSelectTemplate(template);
    toast.success(`Template "${template.name}" inserted`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="template-panel w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 flex flex-col h-full"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">description</span>
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Message Templates</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-slate-400">
            search
          </span>
          <input
            name="templateSearch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFavourites(!showFavourites)}
            className={`p-2 rounded-lg transition-colors ${
              showFavourites
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Show favourites only"
          >
            <span className="material-symbols-outlined text-[18px]">star</span>
          </button>

          <div className="flex-1 overflow-x-auto hide-scrollbar">
            <div className="flex gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    category === cat.value
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse">
              <div className="flex gap-2 mb-2">
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-1" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
            </div>
          ))
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2">description</span>
            <p className="text-sm font-medium">No templates found</p>
            <p className="text-xs mt-1">
              {search || category !== 'all' || showFavourites
                ? 'Try changing your filters'
                : 'Create templates in the Templates section'}
            </p>
          </div>
        ) : (
          templates.map((template) => (
            <TemplateCard
              key={template._id}
              template={template}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 text-center">
        <a
          href="/templates"
          className="text-xs text-primary hover:text-primary-600 font-medium"
        >
          Manage Templates →
        </a>
      </div>
    </motion.div>
  );
}