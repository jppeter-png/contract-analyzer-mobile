import axios from 'axios';

const BASE_URL = 'https://contract-analyzer-backend-2ijl.onrender.com';

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

export async function ocrImages(images) {
  const form = new FormData();
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

export async function analyzeContract(scrubbedText, contractType = 'auto', chunkContext = null) {
  const body = { scrubbedText, contractType };
  if (chunkContext) body.chunkContext = chunkContext;
  const { data } = await api.post('/api/analyze', body, {
    headers: { 'Content-Type': 'application/json' },
  });
  return data;
}