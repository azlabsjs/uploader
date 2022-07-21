
import { Uploader } from '../src';
import { UploaderClientType } from '../src/types';

describe('Uploader implementation test', () => {
  it('should create an uploader instance', () => {
    const uploader = Uploader();
    expect(typeof uploader.upload).toEqual('function');
    expect((uploader as UploaderClientType).options).toEqual({});
  });
});
