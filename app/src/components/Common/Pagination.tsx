import React, { useState, useEffect, memo } from 'react';
import Button from './Button';

function generatePages(total: number, current: number): Array<'...' | number> {
  if (total <= 5) {
    return Array.from(Array(total > 0 ? total : 0).keys());
  }
  if (total > 5 && current < 4) {
    return [0, 1, 2, 3, 4, '...', total - 1];
  }
  if (current >= 4 && total > 4 && current < total - 4) {
    return [0, 1, '...', current - 1, current, current + 1, '...', total - 1];
  }
  if (current >= total - 4) {
    return [0, 1, '...', total - 4, total - 3, total - 2, total - 1];
  }

  return [];
}

type Props = {
  total: number;
  size?: number;
  onPageChange: (offset: number, limit: number) => void;
}

const Pagination: React.FC<Props> = ({ total, size = 20, onPageChange }) => {
  const [totalPage, setTotalPage] = useState(Math.ceil(total / size));
  const [pages, setPages] = useState(generatePages(totalPage, 0));
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setTotalPage(Math.ceil(total / size));
    setPages(generatePages(Math.ceil(total / size), currentPage));
  }, [total, size]);

  useEffect(() => {
    setPages(generatePages(totalPage, currentPage));
    onPageChange(currentPage * size, size);
  }, [currentPage]);

  function handleControl(type: "prev" | "next") {
    if (type === 'prev') {
      if (currentPage !== 0) {
        setCurrentPage((cr) => cr - 1);
      }
    } else if (currentPage < totalPage - 1) {
      setCurrentPage((cr) => cr + 1);
    }
  }

  function handleClickPage(page: "..." | number) {
    if (page !== '...') {
      setCurrentPage(page);
    }
  }

  // For mobile, show fewer pages (only current and adjacent) but ensure all fit
  const getMobilePages = (): Array<'...' | number> => {
    // If 5 or fewer pages, show all
    if (totalPage <= 5) {
      return Array.from(Array(totalPage > 0 ? totalPage : 0).keys());
    }
    // At start: show first 3, ellipsis, last page
    if (currentPage <= 1) {
      return [0, 1, 2, '...', totalPage - 1];
    }
    // At end: show first page, ellipsis, last 3
    if (currentPage >= totalPage - 2) {
      return [0, '...', totalPage - 3, totalPage - 2, totalPage - 1];
    }
    // Middle: show first, ellipsis, current-1, current, current+1, ellipsis, last
    return [0, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPage - 1];
  };

  const mobilePages = getMobilePages();

  return pages && pages.length > 1 ? (
    <div className="w-full mt-4">
      <div className="flex justify-center sm:justify-end items-center overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex items-center gap-1 sm:gap-2 flex-nowrap min-w-max">
          <Button
            type="button"
            onClick={() => handleControl('prev')}
            className="w-8 h-8 sm:w-[33px] sm:h-9 flex justify-center items-center p-0 flex-shrink-0 focus:ring-0 focus:ring-offset-0"
            disabled={currentPage === 0}
          >
            &lt;
          </Button>
          {/* Desktop: Show full pagination */}
          <div className="hidden sm:flex items-center gap-2 flex-nowrap">
            {pages.map((page) => (
              <Button
                type="button"
                color={currentPage === page ? 'primary' : 'default'}
                key={page}
                className="w-[33px] h-9 flex justify-center items-center p-0 flex-shrink-0 focus:ring-0 focus:ring-offset-0"
                onClick={() => handleClickPage(page)}
              >
                {page !== '...' ? page + 1 : page}
              </Button>
            ))}
          </div>
          {/* Mobile: Show simplified pagination with scroll */}
          <div className="flex sm:hidden items-center gap-1 flex-nowrap">
            {mobilePages.map((page, index) => (
              <Button
                type="button"
                color={currentPage === page ? 'primary' : 'default'}
                key={`mobile-${page}-${index}`}
                className="w-8 h-8 flex justify-center items-center p-0 text-xs flex-shrink-0 min-w-[32px] focus:ring-0 focus:ring-offset-0"
                onClick={() => handleClickPage(page)}
              >
                {page !== '...' ? page + 1 : page}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            onClick={() => handleControl('next')}
            className="w-8 h-8 sm:w-[33px] sm:h-9 flex justify-center items-center p-0 flex-shrink-0 focus:ring-0 focus:ring-offset-0"
            disabled={currentPage === totalPage - 1}
          >
            &gt;
          </Button>
        </div>
      </div>
    </div>
  ) : null;
};

export default memo(Pagination);
