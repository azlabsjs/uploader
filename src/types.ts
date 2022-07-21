import {
  Interceptor,
  RequestClient,
  RequestProgressEvent,
} from '@azlabsjs/requests';

type RequestResponseType =
  | 'arraybuffer'
  | 'blob'
  | 'document'
  | 'json'
  | 'text';

// @internal
type StreamDataHandlerFunc = (result?: any) => void;

// @internal
export type NodeStream = {
  on: (
    event: 'data' | 'error' | 'end',
    fn: StreamDataHandlerFunc
  ) => NodeStream;
  once: (event: 'error' | 'end', fn: StreamDataHandlerFunc) => NodeStream;
};

// @internal
export type UploadProgressSubject<T> = {
  next: (value: T) => void;
};

export type UploadOptions<T, R> = {
  /**
   * Subject object that allow clients to listen to upload progress event
   * @property
   */
  subject?: UploadProgressSubject<RequestProgressEvent>;

  /**
   * For client sending file to server as chunk, this property when set can be used
   * by implementation class slice file in chunks
   * @property
   */
  chunkSize?: number;
  /**
   * Additional attributes to add to the request form when sending the upload request
   * @property
   */
  params?: Record<string, unknown>;

  /**
   * Path to server upload resources
   */
  path?: string;
  /**
   * HTTP verb to use when sending request
   *
   * @property
   */
  method?: HTTPRequestMethods;
  /**
   * Name property of the file being uploaded to backend server
   * @property
   */
  name?: string;
  /**
   * The mime type may be used internally by the implementation object
   * to validate the file mimetye before sending it to backend server
   * @property
   */
  mimeType?: string;
  /**
   * The backend property must be used to modify the backend request client
   * used by the uploader object when sending request to file server
   *
   * @property
   */
  backend?: RequestClient<T, R> | string;

  /**
   * Defines an interceptor object may modify the upload request. The interceptor
   * function can be use to transform request options, headers, etc...
   *
   * @property
   */
  interceptor?: Interceptor<T>;

  /**
   * The response type expected from the request server. By default a text response
   * type is used allowing user to decode it if needed.
   *
   * @property
   */
  responseType?: RequestResponseType;

  /**
   * Configuration for basic authentication for apis protected
   * by a basic authorization gateway
   * 
   * @property
   */
  basicAuth?: {
    user: string;
    password: string;
  };
};

export type HTTPRequestMethods =
  | 'GET'
  | 'DELETE'
  | 'OPTION'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'get'
  | 'delete'
  | 'option'
  | 'head'
  | 'post'
  | 'put'
  | 'patch';

export type UploaderRequestOptions = {
  bearerToken?: string;
  basicAuth?: {
    user: string;
    password: string;
  };
};

/**
 * Defines the uploader object type
 */
export type UploaderInterface = {
  /**
   * Provides a contract for sending files to server instance
   * Implementation object might provide the protocol to use when sending
   * file to server depending on the server implemenation
   *
   * @method
   */
  upload: <R>(data: Blob | File | NodeStream | string) => Promise<R>;
};

// @internal
export type UploaderClientType = UploaderInterface & {
  options: UploaderRequestOptions;
  useBearerToken: (token: string) => UploaderClientType;
  useBasicAuthorization: (user: string, password: string) => UploaderClientType;
};