type Listener = () => void;

const listeners = new Set<Listener>();

export function subscribeToFigureChanges(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyFigureChanges() {
  listeners.forEach((listener) => listener());
}
