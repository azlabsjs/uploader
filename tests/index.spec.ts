
import { Uploader } from '../src';

describe('Uploader implementation test', () => {
  it('should create an uploader instance', () => {
    const uploader = Uploader();
    expect(typeof uploader.upload).toEqual('function');
    expect(uploader.options).toEqual({});
  });
});
