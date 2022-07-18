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
import {
  NodeStream,
  UploaderInterface,
  UploaderRequestOptions,
  UploadOptions,
} from './types';

// @internal
export async function prepareRequestBody(
  data: FormData | Blob | File | NodeStream,
  name?: string,
  params?: Record<string, any>
) {
  // Initialize body to a null object by default
  let body!: FormData | File | NodeStream | Blob;
  // Save instanceof formData result in temporary variable to be used later
  const isFormData = data instanceof FormData;
  if (isFormData) {
    body = data;
  } else if (data instanceof File) {
    body = data;
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
      const _body = { [name ?? 'file']: body } as Record<string, any>;
      for (const key in params) {
          _body[key] = params[key];
      }
      return _body;
  } else {
      // Final name case, we simply update the body
      return { [name ?? 'file']: body } as Record<string, any>;
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
export function Uploader(options?: UploadOptions<HttpRequest, HttpResponse>) {
  let client!: RequestClient<HttpRequest, HttpResponse>;
  if (typeof options?.backend === 'undefined' || options?.backend === null) {
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
  // Creates the upload client instance
  // We simply use a javascript object instance instead of creating a class
  // for simplicity reason
  const uploadClient = { options: {} } as UploaderInterface & {
    options: UploaderRequestOptions;
  };

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
    value: async <R>(data: Blob | File | NodeStream) => {
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
              Accept: '*/*',
            },
            interceptors: [
              ..._interceptors.concat(
                ...(options?.interceptor ? [options?.interceptor] : [])
              ),
            ],
          },
        });
        if (response.ok) {
          return response.response as any as R;
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
  return uploadClient as UploaderInterface;
}
