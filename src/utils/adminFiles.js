import { adminFetch } from './adminSession';
import { toast } from './toast';

// Applicants' uploaded documents need the admin session, which a plain link can't send.
// These fetch the file with the session and then show or save it.

const TYPES = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp'
};

// The file name from Content-Disposition: attachment; filename="receipt.jpg"
const fileNameFrom = (response, fallback) => {
  const match = /filename="([^"]+)"/i.exec(response.headers.get('content-disposition') || '');
  return match ? match[1] : fallback;
};

// The server labels every upload application/pdf; use the real type from the name so images show as images.
const typeOf = (fileName) => TYPES[String(fileName).split('.').pop().toLowerCase()] || 'application/octet-stream';

const loadFile = async (url, fallbackName) => {
  const response = await adminFetch(url);
  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Please sign in again.' : "Couldn't open the file.");
  }
  const fileName = fileNameFrom(response, fallbackName);
  const blob = new Blob([await response.arrayBuffer()], { type: typeOf(fileName) });
  return { fileName, objectUrl: URL.createObjectURL(blob) };
};

export const downloadAdminFile = async (url, fallbackName = 'document') => {
  try {
    const { fileName, objectUrl } = await loadFile(url, fallbackName);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (error) {
    toast.error(error.message || "Couldn't download the file. Please try again.");
  }
};

// Opens the file in a new tab (PDFs and images show in the browser). The tab is opened straight away, while
// the click still counts as the admin's, so pop-up blockers allow it; it is filled when the file arrives.
export const openAdminFile = async (url, fallbackName = 'document') => {
  const viewer = window.open('', '_blank');
  if (!viewer) {
    // Pop-ups blocked: save the file instead.
    await downloadAdminFile(url, fallbackName);
    return;
  }
  viewer.document.title = 'Loading…';
  try {
    const { objectUrl } = await loadFile(url, fallbackName);
    viewer.location.href = objectUrl;
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch (error) {
    viewer.close();
    toast.error(error.message || "Couldn't open the file. Please try again.");
  }
};
