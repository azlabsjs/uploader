type ReadAsType = 'binary' | 'text' | 'arraybuffer' | 'dataurl';

/**
 * Base64 encoded string to Blob object
 *
 * @param dataURI
 */
export function dataURItoBlob(dataURI: string) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  const base64StrComponents = dataURI.split(',');
  const bytes =
    typeof Buffer !== 'undefined'
      ? Buffer.from(base64StrComponents[1], 'base64').toString('latin1')
      : atob(base64StrComponents[1]);

  // separate out the mime component
  const mime = base64StrComponents[0].split(':')[1].split(';')[0];

  // write the bytes of the string to an ArrayBuffer
  const buffer = new ArrayBuffer(bytes.length);

  // create a view into the buffer
  const binary = new Uint8Array(buffer);

  // set the bytes of the buffer to the correct values
  for (let i = 0; i < bytes.length; i++) {
    binary[i] = bytes.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  return new Blob([buffer], { type: mime });
}

/**
 * Converts browser Blob object to a File object
 *
 * // @internal
 *
 * @param blob
 */
export function blobToFile(blob: Blob) {
  return new File(
    [blob],
    Math.random().toString(16).substring(2, 15) +
      Math.random().toString(16).substring(2, 15),
    {
      type: blob.type,
      lastModified: new Date().getTime(),
    }
  );
}

function validateBlobInstance(content: Blob | File) {
  if (typeof content === 'undefined' || content === null) {
    throw new Error('binary content must not be null or undefined');
  }

  if (
    content.constructor.prototype !== Blob.prototype &&
    content.constructor.prototype !== File.prototype
  ) {
    throw new Error(
      `Required Blob or File instance got : ${
        typeof content === 'object'
          ? content.constructor.prototype
          : typeof content
      }`
    );
  }
}

/**
 * Reads Blob or File content as 'text'|'binary'|'base64url'|'arraybuffer'
 *
 * @param data
 * @param out
 */
export function readAs<T = ArrayBuffer | string>(
  data: Blob | File,
  out: ReadAsType = 'text'
) {
  validateBlobInstance(data);
  return new Promise<T>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('error', (e) => {
      reject(e.target?.error);
    });
    reader.addEventListener('load', (e) => {
      const result = e.target?.result;
      if (typeof result === 'undefined' || result === null) {
        return reject('Error while reading file content');
      }
      resolve(result as any as T);
    });

    // Default the read result to
    out = out ?? 'text';

    switch (out.toLocaleLowerCase()) {
      case 'dataurl':
        reader.readAsDataURL(data);
        break;
      case 'arraybuffer':
        reader.readAsArrayBuffer(data);
        break;
      case 'binary':
        reader.readAsBinaryString(data);
        break;
      default:
        reader.readAsText(data);
        break;
    }
  });
}
