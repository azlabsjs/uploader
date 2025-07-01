import {
  xhrBackendController,
  HTTPRequest,
  HTTPResponse,
  Interceptor,
  RequestClient,
  useRequestClient,
  fetchBackendController,
  RequestProgressEvent,
  HTTPErrorResponse,
} from '@azlabsjs/requests';

import { blobToFile, dataURItoBlob } from './browser-api';
import { isReadableStream, streamToBlob } from './node-api';

import {
  NodeStream,
  UnknownType,
  UploaderClientType,
  UploaderInterface,
  UploadOptions,
} from './types';

function makeBase64(value: string) {
  return typeof Buffer !== 'undefined'
    ? Buffer.from(value).toString('base64')
    : btoa(value);
}

// @internal
export async function prepareRequestBody(
  data: FormData | Blob | File | NodeStream | string,
  name?: string,
  params?: Record<string, UnknownType>
) {
  // Initialize body to a null object by default
  let body!: FormData | File | NodeStream | Blob;
  // Save instanceof formData result in temporary variable to be used later
  const isFormData =
    typeof FormData !== 'undefined' && data instanceof FormData;
  if (isFormData) {
    body = data;
  } else if (data instanceof File) {
    body = data;
  } else if (typeof data === 'string' && data.substring(0, 5) === 'data:') {
    body = blobToFile(dataURItoBlob(data));
  } else if (data instanceof Blob) {
    body = blobToFile(data);
  } else if (isReadableStream(data)) {
    body = blobToFile(await streamToBlob(data));
  }
  if (null === body) {
    throw new Error(
      'Unsupported body type, supported values are browser <Blob>, <File> objects and nodejs <stream.Readable> object'
    );
  }
  const hasParams = typeof params !== 'undefined' && typeof params === 'object';
  // We check if the request body is a form data. If so, we append the parameters
  // to the form data object
  if (isFormData && hasParams) {
    for (const key in params) {
      (body as FormData).append(key, params[key]);
    }
    return body;
  } else if (hasParams) {
    // Case parameters are provided, we simply add the parameters to a record of string
    // of form data entry
    const _body = { [name ?? 'file']: body } as Record<string, UnknownType>;
    for (const key in params) {
      _body[key] = params[key];
    }
    return _body;
  } else {
    // Final name case, we simply update the body
    return { [name ?? 'file']: body } as Record<string, UnknownType>;
  }
}

// @internal
// Internal request client used by the the uploader instance
function requestClient(endpoint?: string) {
  // By default, when running in a browser environment, we make use of the
  // xhr backend controller else, we use the fetch backend controller
  return useRequestClient(
    typeof window !== 'undefined'
      ? xhrBackendController(endpoint)
      : fetchBackendController(endpoint)
  );
}

// @internal
function uploadClientFactory(
  options?: UploadOptions<HTTPRequest, HTTPResponse>
) {
  // Creates the upload client instance
  // We simply use a javascript object instance instead of creating a class
  // for simplicity reason
  const uploadClient = { options: {} } as UploaderClientType;

  Object.defineProperty(uploadClient, 'useBearerToken', {
    value: (token: string) => {
      uploadClient.options.bearerToken = token;
      return uploadClient;
    },
  });

  Object.defineProperty(uploadClient, 'useBasicAuthorization', {
    value: (user: string, password: string) => {
      uploadClient.options.basicAuth = { user, password };
      return uploadClient;
    },
  });

  // Upload method
  Object.defineProperty(uploadClient, 'upload', {
    value: async <R>(
      data: Blob | File | NodeStream | string,
      progressObserver?: (event: RequestProgressEvent) => void
    ) => {
      //#region Create request client
      let client!: RequestClient<HTTPRequest, HTTPResponse>;
      if (
        typeof options?.backend === 'undefined' ||
        options?.backend === null
      ) {
        client = requestClient();
      }

      if (typeof options?.backend === 'string') {
        client = requestClient(options?.backend);
      }

      if (typeof options?.backend === 'object') {
        client = options?.backend;
      }

      if (typeof client.request !== 'function') {
        throw new Error(
          'Uploader request client must be of type import("@azlabsjs/requests").RequestClient or defines request() method with same definition as RequestClient one'
        );
      }
      //#endregion Creates request client

      //#region Add request interceptors
      const _interceptors = [] as Interceptor<HTTPRequest>[];
      if (
        typeof uploadClient.options.basicAuth !== 'undefined' ||
        uploadClient.options.basicAuth !== null
      ) {
        _interceptors.push((request, next) => {
          request = request.clone({
            options: {
              ...request.options,
              headers: {
                ...request.options?.headers,
                Authorization: `Basic ${makeBase64(
                  `${uploadClient.options.basicAuth?.user}:${uploadClient.options.basicAuth?.password}`
                )}`,
              },
            },
          });
          return next(request);
        });
      }
      if (
        typeof uploadClient.options.bearerToken !== 'undefined' ||
        uploadClient.options.bearerToken !== null
      ) {
        _interceptors.push((request, next) => {
          request = request.clone({
            options: {
              ...request.options,
              headers: {
                ...request.options?.headers,
                Authorization: `Bearer ${uploadClient.options.bearerToken}`,
              },
            },
          });
          return next(request);
        });
      }
      //#endregion Add request interceptors

      //#region Prepare request body
      const body = await prepareRequestBody(
        data,
        options?.name,
        options?.params
      );
      //#endregion Prepare request body
      // #region Send the request to the server
      const response = await client.request({
        url: options?.path || '/',
        method: options?.method ?? 'POST',
        body: body ?? undefined,
        options: {
          onProgress: (event) => {
            if (options?.subject) {
              options?.subject.next(event);
            }
            if (progressObserver) {
              progressObserver(event);
            }
          },
          responseType: options?.responseType ?? 'text',
          headers: {
            Accept:
              options?.responseType === 'json' ? 'application/json' : '*/*',
          },
          interceptors: [
            ..._interceptors.concat(
              ...(options?.interceptor ? [options?.interceptor] : [])
            ),
          ],
        },
      });
      if (response.ok) {
        return response.body as unknown as R;
      }
      throw (response as unknown as HTTPErrorResponse).error ?? response.body;
      //#region Send the request to the server
    },
  });
  return uploadClient;
}

/**
 * Factory function that creates a file uploader, that upload files to
 * HTTP servers using HTTP standard protocol
 *
 * **Note**
 * @todos
 * - Add chunk-upload implementation support to the uploader object
 *
 * @param options
 */
export function Uploader(options?: UploadOptions<HTTPRequest, HTTPResponse>) {
  // Creates the upload client instance
  let uploadClient = uploadClientFactory(options);
  // In case basic authentication configuration is provided by the caller
  // We call the userBasicAuthorization function on the client
  if (
    options?.basicAuth &&
    typeof uploadClient.useBasicAuthorization === 'function'
  ) {
    uploadClient = uploadClient.useBasicAuthorization(
      options.basicAuth.user,
      options.basicAuth.password
    );
  }
  return uploadClient as UploaderInterface;
}
