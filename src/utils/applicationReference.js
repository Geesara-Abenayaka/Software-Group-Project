// Short reference a student can quote, made from the application's MongoDB id: APP-1A2B3C.
export const formatReference = (id) => (id ? `APP-${String(id).slice(-6).toUpperCase()}` : '');
