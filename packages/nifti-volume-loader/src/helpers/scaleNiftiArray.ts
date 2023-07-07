/**
 * Given a pixel array, rescale the pixel values using the rescale slope and
 * intercept and if modality is PT it uses the suv values to scale the array
 * @param array - The array to be scaled.
 * @param scalingParameters - The scaling parameters
 * @returns The array being scaled
 */
export default function scaleNiftiArray(
  array: Float32Array | Int16Array | Uint8Array,
  niftiHeader
): void {
  const arrayLength = array.length;
  const { scl_slope, scl_inter } = niftiHeader;

  if (scl_slope === 0 || Number.isNaN(scl_slope)) {
    // No scaling encoded in NIFTI header
    return;
  }

  for (let i = 0; i < arrayLength; i++) {
    array[i] = array[i] * scl_slope + scl_inter;
  }
}
