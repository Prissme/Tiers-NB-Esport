const path = require('path');

let isPatched = false;

function resolveUndici() {
  try {
    return require('undici');
  } catch (error) {
    try {
      const fallbackPath = require.resolve('undici', { paths: [path.join(__dirname, 'discord-bot')] });
      return require(fallbackPath);
    } catch (fallbackError) {
      const combinedError = new Error(
        'Unable to load the "undici" HTTP client. Install it or ensure dependencies are installed.'
      );
      combinedError.cause = fallbackError;
      throw combinedError;
    }
  }
}

function ensureFetch() {
  if (isPatched) {
    return;
  }

  if (typeof globalThis.fetch === 'function') {
    isPatched = true;
    return;
  }

  const undici = resolveUndici();
  const { fetch, Headers, Request, Response, FormData, File, Blob } = undici;

  if (typeof fetch === 'function' && !globalThis.fetch) {
    globalThis.fetch = fetch;
  }

  if (Headers && !globalThis.Headers) {
    globalThis.Headers = Headers;
  }

  if (Request && !globalThis.Request) {
    globalThis.Request = Request;
  }

  if (Response && !globalThis.Response) {
    globalThis.Response = Response;
  }

  if (FormData && !globalThis.FormData) {
    globalThis.FormData = FormData;
  }

  if (File && !globalThis.File) {
    globalThis.File = File;
  }

  if (Blob && !globalThis.Blob) {
    globalThis.Blob = Blob;
  }

  isPatched = true;
}

ensureFetch();

module.exports = ensureFetch;
