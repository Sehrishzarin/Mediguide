// Slot dates are 'YYYY-MM-DD' and times are 24h 'HH:mm' (local clinic time).
export const slotToDate = (date, time = '00:00') => {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
};

export const formatSlotDate = (date, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  slotToDate(date).toLocaleDateString(undefined, opts);

export const formatSlotTime = (date, time) =>
  slotToDate(date, time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export const formatSlotLong = (date, time) =>
  `${formatSlotDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} at ${formatSlotTime(date, time)}`;
