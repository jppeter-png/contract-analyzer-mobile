import axios from 'axios';
import { getLanguage } from './i18n';

export const BASE_URL = 'https://contract-analyzer-backend-2ijl.onrender.com';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
});

export async function scrubDocument(file) {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || 'application/octet-stream',
  });
  const { data } = await api.post('/api/scrub', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function scrubText(text) {
  const { data } = await api.post('/api/scrub', { text }, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
}

// documentLanguage: the language the pages are written in (English is always read as well).
export async function ocrImages(images, documentLanguage = getLanguage()) {
  const form = new FormData();
  form.append('languages', documentLanguage);
  images.forEach((img, i) => {
    form.append('images', {
      uri: img.uri,
      name: `page_${i + 1}.jpg`,
      type: 'image/jpeg',
    });
  });
  const { data } = await api.post('/api/ocr', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
  });
  return data;
}

export async function analyzeContract(scrubbedText, contractType = 'auto', chunkContext = null, signal = null) {
  // The explanation comes back in the language the user reads, whatever language the document is in.
  const body = { scrubbedText, contractType, outputLanguage: getLanguage() };
  if (chunkContext) body.chunkContext = chunkContext;
  const { data } = await api.post('/api/analyze', body, {
    headers: { 'Content-Type': 'application/json' },
    signal,
  });
  return data;
}