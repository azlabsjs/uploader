import { UnknownType } from './types';

/** @description Converts node stream object to blob instance */
export function streamToBlob(
  stream: UnknownType,
  mimeType = 'application/octet-stream'
) {
  if (
    mimeType !== null &&
    typeof mimeType !== 'undefined' &&
    typeof mimeType !== 'string'
  ) {
    throw new Error('Invalid mimetype, expected string.');
  }
  return new Promise<Blob>((resolve, reject) => {
    const chunks: BlobPart[] = [];
    stream
      .on('data', (chunk: BlobPart) => chunks.push(chunk))
      .once('end', () => {
        const blob =
          mimeType !== null && typeof mimeType !== 'undefined'
            ? new Blob(chunks, { type: mimeType })
            : new Blob(chunks);
        resolve(blob);
      })
      .once('error', reject);
  });
}

//@internal
export function isReadableStream(data: UnknownType) {
  return typeof data.on === 'function' && typeof data.once === 'function';
}
