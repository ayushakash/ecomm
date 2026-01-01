import React, { useState, useEffect } from 'react';

const ResponsiveTable = ({
  data = [],
  renderCard,
  renderTableRow,
  tableHeaders,
  loading = false,
  emptyMessage = "No data available",
  className = ""
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">{emptyMessage}</div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className={`grid grid-cols-1 gap-4 ${className}`}>
        {data.map((item, index) => (
          <div key={item._id || item.id || index}>
            {renderCard(item, index)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full border border-gray-200 divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {tableHeaders.map((header, index) => (
              <th
                key={index}
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {data.map((item, index) => (
            <React.Fragment key={item._id || item.id || index}>
              {renderTableRow(item, index)}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResponsiveTable;