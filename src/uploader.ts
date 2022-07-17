import {
  xhrBackendController,
  HttpRequest,
  HttpResponse,
  Interceptor,
  RequestClient,
  useRequestClient,
  fetchBackendController,
} from '@azlabsjs/requests';
import { blobToFile } from './browser-api';
import { isReadableStream, streamToBlob } from './node-api';
import { NodeStream, UploaderInterface, UploadOptions } from './types';

// @internal
async function prepareRequestBody(
  data: FormData | Blob | File | NodeStream,
  name?: string,
  params?: Record<string, any>
) {
  // Initialize body to a null object by default
  let body!:
    | FormData
    | Record<string, FormDataEntryValue>
    | File
    | NodeStream
    | Blob;
  // Save instanceof formData result in temporary variable to be used later
  const isFormData = data instanceof FormData;
  if (isFormData) {
    body = data;
  } else if (data instanceof File) {
    body = { [name ?? 'file']: data };
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
  if (isFormData && hasParams) {
    for (const key in params) {
      (body as FormData).append(key, params[key]);
    }
  } else if (hasParams) {
    body = { [name ?? 'file']: body } as Record<string, any>;
    for (const key in params) {
      body[key] = params[key];
    }
  }
  return body;
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

/**
 * Creates an upload client for sending files to storage server
 *
 * **Note**
 * @todos
 * - Add chunk-upload implementation support to the uploader object
 *
 * @param backend
 * @param options
 */
export function Uploader(
  backend?: RequestClient<HttpRequest, HttpResponse> | string,
  options?: UploadOptions
) {
  let client!: RequestClient<HttpRequest, HttpResponse>;
  if (typeof backend === 'undefined' || backend === null) {
    client = requestClient();
  }

  if (typeof backend === 'string') {
    client = requestClient(backend);
  }

  if (typeof backend === 'object') {
    client = backend;
  }

  if (typeof client.request !== 'function') {
    throw new Error(
      'Uploader request client must be of type import("@azlabsjs/requests").RequestClient or defines request() method with same definition as RequestClient one'
    );
  }
  // Creates the upload client instance
  // We simply use a javascript object instance instead of creating a class
  // for simplicity reason
  const uploadClient = { options: {} } as UploaderInterface;

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
    value: async (data: Blob | File | NodeStream) => {
      // Create request client
      const _interceptors = [] as Interceptor<HttpRequest>[];
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
                Authorization: `Basic ${Buffer.from(
                  `${uploadClient.options.basicAuth?.user}:${uploadClient.options.basicAuth?.password}`
                ).toString('base64')}`,
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
      try {
        const response = await client.request({
          url: options?.path || '/',
          method: options?.method ?? 'POST',
          body:
            prepareRequestBody(data, options?.name, options?.params) ??
            undefined,
          options: {
            onProgress: (event) => {
              if (options?.subject) {
                options?.subject.next(event);
              }
            },
            responseType: 'text',
            headers: {
              Accept: 'application/json',
            },
            interceptors: _interceptors,
          },
        });
        if (response.ok) {
          return response.response;
        }
        throw response.response;
      } catch (error) {
        if (typeof error === 'object') {
          throw new Error((error as any)?.error);
        }
        throw error;
      }
    },
  });

  return uploadClient;
}
