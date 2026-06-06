// Here we ideally could have a server that responds with range reads,
// and we could use the fetch API to load the imageId for that specific slice.
// However, we can safely assume the server can only provide the whole volume at once.
// So, we just fetch the entire volume by streaming.
// We create images one by one when their corresponding slice is ready.
// We then create the image and let Cornerstone handle the texture upload and rendering.
import type { Types } from '@cornerstonejs/core';
import {
  Enums,
  eventTarget,
  metaData,
  triggerEvent,
  utilities,
} from '@cornerstonejs/core';
import * as NiftiReader from 'nifti-reader-js';
import { Events } from './enums';
import { modalityScaleNifti } from './helpers';
import { getOptions } from './internal';

type NiftiDataFetchState =
  | {
      status: 'fetching';
    }
  | {
      status: 'fetched';
      scalarData: Types.PixelDataTypedArray;
    };

const dataFetchStateMap: Map<string, NiftiDataFetchState> = new Map();

async function fetchArrayBuffer({
  url,
  signal,
  onload,
}: {
  url: string;
  signal?: AbortSignal;
  onload?: () => void;
}): Promise<ArrayBuffer> {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);

  const defaultHeaders = {} as Record<string, string>;
  const options = getOptions();

  const beforeSendHeaders = await options.beforeSend(xhr, defaultHeaders, url);
  const headers = Object.assign({}, defaultHeaders, beforeSendHeaders);

  xhr.responseType = 'arraybuffer';

  Object.keys(headers).forEach(function (key) {
    if (headers[key] === null) {
      return;
    }
    xhr.setRequestHeader(key, headers[key]);
  });

  return new Promise((resolve, reject) => {
    const onLoadHandler = function (_e: Event) {
      if (onload && typeof onload === 'function') {
        onload();
      }

      // Remove event listener for 'abort'
      if (signal) {
        signal.removeEventListener('abort', onAbortHandler);
      }

      resolve(xhr.response);
    };

    const onAbortHandler = () => {
      xhr.abort();

      // Remove event listener for 'load'
      xhr.removeEventListener('load', onLoadHandler);

      reject(new Error('Request aborted'));
    };

    xhr.addEventListener('load', onLoadHandler);

    const onProgress = (loaded: number, total: number) => {
      const data = { url, loaded, total };
      triggerEvent(eventTarget, Events.NIFTI_VOLUME_PROGRESS, { data });
    };

    xhr.onprogress = function (e) {
      onProgress(e.loaded, e.total);
    };

    if (signal && signal.aborted) {
      xhr.abort();
      reject(new Error('Request aborted'));
    } else if (signal) {
      signal.addEventListener('abort', onAbortHandler);
    }

    xhr.send();
  });
}

export default function cornerstoneNiftiImageLoader(
  imageId: string
): Types.IImageLoadObject {
  const [url, frame] = imageId.substring(6).split('?frame=');
  const sliceIndex = parseInt(frame, 10);

  const imagePixelModule = metaData.get(
    Enums.MetadataModules.IMAGE_PIXEL,
    imageId
  ) as Types.ImagePixelModule;

  const imagePlaneModule = metaData.get(
    Enums.MetadataModules.IMAGE_PLANE,
    imageId
  ) as Types.ImagePlaneModule;

  const promise = new Promise<Types.IImage>((resolve, reject) => {
    if (!dataFetchStateMap.get(url)) {
      dataFetchStateMap.set(url, { status: 'fetching' });
      fetchAndProcessNiftiData(
        imageId,
        url,
        sliceIndex,
        imagePixelModule,
        imagePlaneModule
      )
        .then(resolve)
        .catch(reject);
    } else {
      waitForNiftiData(
        imageId,
        url,
        sliceIndex,
        imagePixelModule,
        imagePlaneModule
      )
        .then(resolve)
        .catch(reject);
    }
  });

  return {
    promise: promise as Promise<Types.IImage>,
    cancelFn: undefined, // TODO: add proper cancel function
    decache: () => {
      dataFetchStateMap.delete(url);
    },
  };
}

async function fetchAndProcessNiftiData(
  imageId: string,
  url: string,
  sliceIndex: number,
  imagePixelModule: Types.ImagePixelModule,
  imagePlaneModule: Types.ImagePlaneModule
): Promise<Types.IImage> {
  let niftiBuffer = await fetchArrayBuffer({ url });
  let niftiHeader = null;
  let niftiImage = null;

  if (NiftiReader.isCompressed(niftiBuffer)) {
    niftiBuffer = NiftiReader.decompress(niftiBuffer);
  }

  if (NiftiReader.isNIFTI(niftiBuffer)) {
    niftiHeader = NiftiReader.readHeader(niftiBuffer);
    niftiImage = NiftiReader.readImage(niftiHeader, niftiBuffer);
  } else {
    const errorMessage = 'The provided buffer is not a valid NIFTI file.';
    console.warn(errorMessage);
    throw new Error(errorMessage);
  }

  const { scalarData } = modalityScaleNifti(niftiHeader, niftiImage);
  dataFetchStateMap.set(url, { status: 'fetched', scalarData });

  return createImage(
    imageId,
    sliceIndex,
    imagePixelModule,
    imagePlaneModule,
    scalarData
  ) as unknown as Types.IImage;
}

function waitForNiftiData(
  imageId,
  url: string,
  sliceIndex: number,
  imagePixelModule: Types.ImagePixelModule,
  imagePlaneModule: Types.ImagePlaneModule
): Promise<Types.IImage> {
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(() => {
      const dataFetchState = dataFetchStateMap.get(url);

      if (!dataFetchState) {
        clearInterval(intervalId);
        reject(
          `dataFetchState for ${url} is not found. The cache was purged before it completed loading.`
        );
      }

      if (dataFetchState?.status === 'fetched') {
        clearInterval(intervalId);
        resolve(
          createImage(
            imageId,
            sliceIndex,
            imagePixelModule,
            imagePlaneModule,
            dataFetchState.scalarData
          ) as unknown as Types.IImage
        );
      }
    }, 10);
  });
}

function createImage(
  imageId: string,
  sliceIndex: number,
  imagePixelModule: Types.ImagePixelModule,
  imagePlaneModule: Types.ImagePlaneModule,
  niftiScalarData: Types.PixelDataTypedArray
) {
  const { rows, columns } = imagePlaneModule;
  const numVoxels = rows * columns;

  const pixelData = new (niftiScalarData.constructor as {
    new (size: number): Types.PixelDataTypedArray;
  })(numVoxels);

  const niftiHeaderMeta = metaData.get('niftiHeader', imageId) as {
    sliceDimIndex?: number;
    header?: { dims: number[] };
  };
  const sliceDimIndex: number = niftiHeaderMeta?.sliceDimIndex ?? 2;
  const niftiHdr = niftiHeaderMeta?.header;

  if (sliceDimIndex === 2 || !niftiHdr) {
    // k-slice (default): all voxels for one k-plane are contiguous in memory
    const sliceOffset = numVoxels * sliceIndex;
    pixelData.set(
      niftiScalarData.subarray(sliceOffset, sliceOffset + numVoxels)
    );
  } else if (sliceDimIndex === 1) {
    // j-slice: pixel(row=k, col=i) = voxel(i, j=sliceIndex, k)
    // NIfTI index: i + j*dimI + k*dimI*dimJ — for fixed k the i-values are contiguous
    const dimI = niftiHdr.dims[1];
    const dimJ = niftiHdr.dims[2];
    for (let k = 0; k < rows; k++) {
      const srcOffset = sliceIndex * dimI + k * dimI * dimJ;
      pixelData.set(
        niftiScalarData.subarray(srcOffset, srcOffset + dimI),
        k * dimI
      );
    }
  } else {
    // i-slice: pixel(row=k, col=j) = voxel(i=sliceIndex, j, k)
    // NIfTI index: sliceIndex + j*dimI + k*dimI*dimJ — strided, requires per-voxel copy
    const dimI = niftiHdr.dims[1];
    const dimJ = niftiHdr.dims[2];
    for (let k = 0; k < rows; k++) {
      for (let j = 0; j < columns; j++) {
        pixelData[k * columns + j] =
          niftiScalarData[sliceIndex + j * dimI + k * dimI * dimJ];
      }
    }
  }

  // @ts-ignore
  const voxelManager = utilities.VoxelManager.createImageVoxelManager({
    width: columns,
    height: rows,
    numberOfComponents: 1,
    scalarData: pixelData,
  });

  let minPixelValue = pixelData[0];
  let maxPixelValue = pixelData[0];
  for (let i = 1; i < pixelData.length; i++) {
    const pixelValue = pixelData[i];
    if (pixelValue < minPixelValue) {
      minPixelValue = pixelValue;
    }
    if (pixelValue > maxPixelValue) {
      maxPixelValue = pixelValue;
    }
  }

  return {
    imageId,
    dataType: niftiScalarData.constructor
      .name as Types.PixelDataTypedArrayString,
    columnPixelSpacing: imagePlaneModule.columnPixelSpacing,
    columns: imagePlaneModule.columns,
    height: imagePlaneModule.rows,
    invert: imagePixelModule.photometricInterpretation === 'MONOCHROME1',
    rowPixelSpacing: imagePlaneModule.rowPixelSpacing,
    rows: imagePlaneModule.rows,
    sizeInBytes: rows * columns * niftiScalarData.BYTES_PER_ELEMENT,
    width: imagePlaneModule.columns,
    getPixelData: () => voxelManager.getScalarData(),
    getCanvas: undefined,
    numberOfComponents: undefined,
    voxelManager,
    minPixelValue,
    maxPixelValue,
  };
}
