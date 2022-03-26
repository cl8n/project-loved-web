const isoStringTemplate = '0001-01-01T00:00:00.000Z';

function fullIsoString(dateOrIsoString: Date | string) {
  if (dateOrIsoString instanceof Date) {
    return dateOrIsoString.toISOString();
  }

  return (
    dateOrIsoString.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T') +
    isoStringTemplate.slice(dateOrIsoString.length)
  );
}

export function dateFromString(dateString: string): Date;
export function dateFromString(dateString: string | null | undefined): Date | undefined;
export function dateFromString(dateString: string | null | undefined) {
  if (dateString == null) {
    return;
  }

  return new Date(fullIsoString(dateString));
}

export function inputDateTime(dateOrIsoString: Date | string): string;
export function inputDateTime(
  dateOrIsoString: Date | string | null | undefined,
): string | undefined;
export function inputDateTime(dateOrIsoString: Date | string | null | undefined) {
  if (dateOrIsoString == null) {
    return;
  }

  const isoString = fullIsoString(dateOrIsoString);

  return isoString.slice(0, 10) + 'T' + isoString.slice(11, 16);
}

export function mySqlDateTime(dateOrIsoString: Date | string): string;
export function mySqlDateTime(
  dateOrIsoString: Date | string | null | undefined,
): string | undefined;
export function mySqlDateTime(dateOrIsoString: Date | string | null | undefined) {
  if (dateOrIsoString == null) {
    return;
  }

  const isoString = fullIsoString(dateOrIsoString);

  return isoString.slice(0, 10) + ' ' + isoString.slice(11, 19);
}
