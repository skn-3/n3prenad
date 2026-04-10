const COUNTER_KEY = 'smartklimat-order-counter';

export function getNextOrderNumber(): number {
  const current = parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10);
  const next = current + 1;
  localStorage.setItem(COUNTER_KEY, String(next));
  return next;
}

export function peekOrderNumber(): number {
  return parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10) + 1;
}
