# Package documentation

Uploader package provides a simple interface for uploading files to File server using HTTP protocol (while implementation can provide interfaces using other protocols such as ftp, smb, etc...).

At it high level, the package provides a factory function for creating the uploader object using a set of configuration attributes.

## Usage

Using the factory function to create an uploader instance:

```js
// Creates an uploader instance that will send files to the specify URL endpoint
const uploader = Uploader({
    path: 'https://storage.lik.tg/api/storage/object/upload',
});
```

* Send / upload file to server

The uploader defines a single interface method `upload` for uploading files. It takes an instance of browser `Blob` or `File` object, or NodeJS `stream.Readable` object or even as url endoded data.

```js
const result = await uploader.upload(
  convertBlobToFile(dataURItoBlob(blobContent), 'image.jpg') // 
);
```

**Note**
The previous code will use `file` as attribute name when sending the file to the server. Therefore, server side implementation must get the uploaded content from a `file` attribute.

To customize the name attribute send through the request, developper must pass a `name` attribute as follow:

```js
const uploader = Uploader({
    path: '<URL>',
    name: 'content' // Use `content` attribute instead of the default name attribute
});
```

* Authorization

Some servers may request might request for an authorization to process file upload. The uploader allow developper to modify the request on the fly before sending it to file server using interceptors.

```js
const uploader = Uploader({
    path: 'https://storage.lik.tg/api/storage/object/upload',
    name: 'content',
    // Here we provides a request interceptor that add an HTTP Basic Authorization
    // header to the request internally used by the uploader instance
    interceptor: (request, next) => {
        request = request.clone({
            options: {
                ...request.options,
                headers: {
                    ...request.options?.headers,
                    Authorization: `Basic ${Buffer.from(
                  `${BASIC_AUTH_USER}:${BASIC_AUTH_PASS}`
                ).toString('base64')}`,
                },
            },
        });
        return next(request);
    }
});
```

**Note**
Below is the full API type definition of the `UploadOptions`:

```js
{
  /**
   * Subject object that allow clients to listen to upload progress event
   * 
   * @property
   */
  subject?: UploadProgressSubject<HttpProgressEvent>;

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
}
```
