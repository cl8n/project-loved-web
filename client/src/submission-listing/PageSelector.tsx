const pageOptionsAround = 3;
const pageOptionsTotal = pageOptionsAround * 2 + 1;

interface PageSelectorProps {
  page: number;
  pageCount: number;
  setPage: (page: number) => void;
}

export default function PageSelector({ page, pageCount, setPage }: PageSelectorProps) {
  let startPage;
  let endPage;

  if (pageCount <= pageOptionsTotal) {
    startPage = 1;
    endPage = pageCount;
  } else if (page < 1 + pageOptionsAround) {
    startPage = 1;
    endPage = pageOptionsTotal;
  } else if (page > pageCount - pageOptionsAround) {
    startPage = pageCount - pageOptionsTotal + 1;
    endPage = pageCount;
  } else {
    startPage = page - pageOptionsAround;
    endPage = page + pageOptionsAround;
  }

  const pageCandidates = [];

  for (let i = startPage; i <= endPage; i++) {
    pageCandidates.push(i);
  }

  return (
    <div className='page-selector'>
      <button type='button' disabled={page <= 1} onClick={() => setPage(1)}>
        ◀◀
      </button>
      <button type='button' disabled={page <= 1} onClick={() => setPage(page - 1)}>
        ◀
      </button>
      {pageCandidates.map((pageCandidate) => (
        <button
          key={pageCandidate}
          type='button'
          className={pageCandidate === page ? 'selected' : undefined}
          onClick={() => setPage(pageCandidate)}
        >
          {pageCandidate}
        </button>
      ))}
      <button type='button' disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
        ▶
      </button>
      <button type='button' disabled={page >= pageCount} onClick={() => setPage(pageCount)}>
        ▶▶
      </button>
    </div>
  );
}
