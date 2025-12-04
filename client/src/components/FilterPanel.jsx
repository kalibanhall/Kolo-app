import React from 'react';

export const FilterPanel = ({ filters, onFilterChange, onReset, filterConfig }) => {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">🔍 Filtres</h3>
        <button
          onClick={onReset}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          Réinitialiser
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Input */}
        {filterConfig.search && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => handleChange('search', e.target.value)}
              placeholder={filterConfig.search.placeholder || 'Rechercher...'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        )}

        {/* Status Filter */}
        {filterConfig.status && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              {filterConfig.status.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Range Start */}
        {filterConfig.dateRange && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date début
              </label>
              <input
                type="date"
                value={filters.dateStart || ''}
                onChange={(e) => handleChange('dateStart', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date fin
              </label>
              <input
                type="date"
                value={filters.dateEnd || ''}
                onChange={(e) => handleChange('dateEnd', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </>
        )}

        {/* Price Range */}
        {filterConfig.priceRange && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix min
              </label>
              <input
                type="number"
                value={filters.priceMin || ''}
                onChange={(e) => handleChange('priceMin', e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prix max
              </label>
              <input
                type="number"
                value={filters.priceMax || ''}
                onChange={(e) => handleChange('priceMax', e.target.value)}
                placeholder="1000"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </>
        )}

        {/* Category Filter */}
        {filterConfig.category && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie
            </label>
            <select
              value={filters.category || ''}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Toutes les catégories</option>
              {filterConfig.category.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Custom Filters */}
        {filterConfig.custom &&
          filterConfig.custom.map((customFilter) => (
            <div key={customFilter.key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {customFilter.label}
              </label>
              {customFilter.type === 'select' ? (
                <select
                  value={filters[customFilter.key] || ''}
                  onChange={(e) => handleChange(customFilter.key, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Tous</option>
                  {customFilter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : customFilter.type === 'number' ? (
                <input
                  type="number"
                  value={filters[customFilter.key] || ''}
                  onChange={(e) => handleChange(customFilter.key, e.target.value)}
                  placeholder={customFilter.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              ) : (
                <input
                  type="text"
                  value={filters[customFilter.key] || ''}
                  onChange={(e) => handleChange(customFilter.key, e.target.value)}
                  placeholder={customFilter.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              )}
            </div>
          ))}
      </div>

      {/* Active Filters Display */}
      {Object.keys(filters).some((key) => filters[key]) && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Filtres actifs:</span>
            {Object.entries(filters).map(
              ([key, value]) =>
                value && (
                  <span
                    key={key}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700"
                  >
                    {key}: {value}
                    <button
                      onClick={() => handleChange(key, '')}
                      className="ml-2 hover:text-purple-900"
                    >
                      ×
                    </button>
                  </span>
                )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
