import { compressPhoto, type PhotoCompressOptions, type PhotoCompressResult } from '../../src/media/photo/compress';

export function compressPhotoPreferWorker(
  source: Blob | File,
  opts: PhotoCompressOptions & { preferWorker?: boolean },
): Promise<PhotoCompressResult> {
  const { preferWorker: _preferWorker, ...rest } = opts;
  return compressPhoto(source, rest);
}
