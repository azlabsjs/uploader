/**
 * Converts node stream object to blob instance
 *
 * @internal
 *
 * @param stream
 * @param mimeType
 */
export function streamToBlob(
  stream: any,
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
export function isReadableStream(data: any) {
  return (
    typeof data.on !== null &&
    typeof data.on === 'function' &&
    typeof data.once !== null &&
    typeof data.once === 'function'
  );
}
