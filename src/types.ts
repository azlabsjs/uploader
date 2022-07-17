import { HttpProgressEvent } from '@azlabsjs/requests';

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

export type UploadOptions = {
  subject: UploadProgressSubject<HttpProgressEvent>;
  chunkSize?: number;
  params?: Record<string, unknown>;
  path?: string;
  method?: HTTPRequestMethods;
  name?: string;
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
  options: UploaderRequestOptions;
  upload: <T>(data: Blob | File | NodeStream) => Promise<T>;
};
