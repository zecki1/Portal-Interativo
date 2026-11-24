export interface StorageAdapter {
  upload(key: string, data: Buffer, mime: string): Promise<string>;
  getSignedUrl(key: string): Promise<string>;
}

export class AzureBlobAdapter implements StorageAdapter {
  async upload(key: string, _data: Buffer, _mime: string): Promise<string> {
    // TODO: implementar com @azure/storage-blob
    return key;
  }
  async getSignedUrl(key: string): Promise<string> {
    return key;
  }
}
