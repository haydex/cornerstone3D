import {
  RenderingEngine,
  Types,
  Enums,
  setVolumesForViewports,
  volumeLoader,
} from '@cornerstonejs/core';
import {
  initDemo,
  createImageIdsAndCacheMetaData,
  setTitleAndDescription,
  setCtTransferFunctionForVolumeActor,
  setPetColorMapTransferFunctionForVolumeActor,
} from '../../../../utils/demo/helpers';
import * as cornerstoneTools from '@cornerstonejs/tools';

// This is for debugging purposes
console.warn(
  'Click on index.ts to open source code for this example --------->'
);

const {
  SegmentationDisplayTool,
  ToolGroupManager,
  Enums: csToolsEnums,
  RectangleROIThresholdTool,
  PanTool,
  ZoomTool,
  StackScrollMouseWheelTool,
} = cornerstoneTools;

const { MouseBindings } = csToolsEnums;
const { ViewportType } = Enums;

// Define a unique id for the volume
const volumeLoaderScheme = 'cornerstoneStreamingImageVolume'; // Loader id which defines which volume loader to use

const ctVolumeName = 'CT_VOLUME_ID'; // Id of the volume less loader prefix
const ctVolumeId = `${volumeLoaderScheme}:${ctVolumeName}`; // VolumeId with loader id + volume id
const ptVolumeName = 'PT_VOLUME_ID';
const ptVolumeId = `${volumeLoaderScheme}:${ptVolumeName}`;
const volumeId = ptVolumeId;

const toolGroupId = 'MY_TOOLGROUP_ID';

// ======== Set up page ======== //
setTitleAndDescription(
  'POSDA Rectangle ROI Threshold Tool',
  'Here we demonstrate usage of the ROI Threshold tool'
);

const size = '500px';
const content = document.getElementById('content');
const viewportGrid = document.createElement('div');

viewportGrid.style.display = 'flex';
viewportGrid.style.display = 'flex';
viewportGrid.style.flexDirection = 'row';

const element1 = document.createElement('div');
const element2 = document.createElement('div');
const element3 = document.createElement('div');
element1.style.width = size;
element1.style.height = size;
element2.style.width = size;
element2.style.height = size;
element3.style.width = size;
element3.style.height = size;

// Disable right click context menu so we can have right click tools
element1.oncontextmenu = (e) => e.preventDefault();
element2.oncontextmenu = (e) => e.preventDefault();
element3.oncontextmenu = (e) => e.preventDefault();

viewportGrid.appendChild(element1);
viewportGrid.appendChild(element2);
viewportGrid.appendChild(element3);

content.appendChild(viewportGrid);

const instructions = document.createElement('p');
instructions.innerText = `
  - Draw a target region with the left click.

  Middle Click: Pan
  Right Click: Zoom
  Mouse wheel: Scroll Stack
  `;

content.append(instructions);

/**
 * Runs the demo
 */
async function run() {
  // Init Cornerstone and related libraries
  await initDemo();

  // Add tools to Cornerstone3D
  cornerstoneTools.addTool(PanTool);
  cornerstoneTools.addTool(ZoomTool);
  cornerstoneTools.addTool(StackScrollMouseWheelTool);
  cornerstoneTools.addTool(RectangleROIThresholdTool);

  // Define tool groups to add the segmentation display tool to
  const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

  // Manipulation Tools
  toolGroup.addTool(PanTool.toolName);
  toolGroup.addTool(ZoomTool.toolName);
  toolGroup.addTool(StackScrollMouseWheelTool.toolName);

  // Segmentation Tools
  toolGroup.addTool(RectangleROIThresholdTool.toolName);
  toolGroup.setToolEnabled(SegmentationDisplayTool.toolName);

  toolGroup.setToolActive(RectangleROIThresholdTool.toolName, {
    bindings: [{ mouseButton: MouseBindings.Primary }],
  });

  toolGroup.setToolActive(PanTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Auxiliary, // Middle Click
      },
    ],
  });
  toolGroup.setToolActive(ZoomTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Secondary, // Right Click
      },
    ],
  });
  // As the Stack Scroll mouse wheel is a tool using the `mouseWheelCallback`
  // hook instead of mouse buttons, it does not need to assign any mouse button.
  toolGroup.setToolActive(StackScrollMouseWheelTool.toolName);

  const wadoRsRoot = 'http://localhost/Orthanc/dicom-web';
  const StudyInstanceUID =
    '1.3.6.1.4.1.14519.5.2.1.217716597069695228202996103446901844066';

  // Get Cornerstone imageIds and fetch metadata into RAM
  const ctImageIds = await createImageIdsAndCacheMetaData({
    StudyInstanceUID,
    SeriesInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.186848473283379477869709168257845339904',
    wadoRsRoot,
  });

  const ptImageIds = await createImageIdsAndCacheMetaData({
    StudyInstanceUID,
    SeriesInstanceUID:
      '1.3.6.1.4.1.14519.5.2.1.186848473283379477869709168257845339904',
    wadoRsRoot,
  });

  // Define a volume in memory
  const ctVolume = await volumeLoader.createAndCacheVolume(ctVolumeId, {
    imageIds: ctImageIds,
  });
  // Define a volume in memory
  const ptVolume = await volumeLoader.createAndCacheVolume(ptVolumeId, {
    imageIds: ptImageIds,
  });

  // Instantiate a rendering engine
  const renderingEngineId = 'myRenderingEngine';
  const renderingEngine = new RenderingEngine(renderingEngineId);

  // Create the viewports
  const viewportId1 = 'CT_AXIAL';
  const viewportId2 = 'CT_SAGITTAL';
  const viewportId3 = 'CT_CORONAL';

  const viewportInputArray = [
    {
      viewportId: viewportId1,
      type: ViewportType.ORTHOGRAPHIC,
      element: element1,
      defaultOptions: {
        orientation: Enums.OrientationAxis.CORONAL,
        background: <Types.Point3>[0, 0, 0],
      },
    },
    {
      viewportId: viewportId2,
      type: ViewportType.ORTHOGRAPHIC,
      element: element2,
      defaultOptions: {
        orientation: Enums.OrientationAxis.SAGITTAL,
        background: <Types.Point3>[0, 0, 0],
      },
    },
    {
      viewportId: viewportId3,
      type: ViewportType.ORTHOGRAPHIC,
      element: element3,
      defaultOptions: {
        orientation: Enums.OrientationAxis.AXIAL,
        background: <Types.Point3>[0, 0, 0],
      },
    },
  ];

  renderingEngine.setViewports(viewportInputArray);

  toolGroup.addViewport(viewportId1, renderingEngineId);
  toolGroup.addViewport(viewportId2, renderingEngineId);
  toolGroup.addViewport(viewportId3, renderingEngineId);

  // Set the volumes to load
  ptVolume.load();
  ctVolume.load();

  // Set volumes on the viewports
  await setVolumesForViewports(
    renderingEngine,
    [{ volumeId, callback: setCtTransferFunctionForVolumeActor }],
    [viewportId1, viewportId2, viewportId3]
  );

  await setVolumesForViewports(
    renderingEngine,
    [
      {
        volumeId: ctVolumeId,
        callback: setCtTransferFunctionForVolumeActor,
      },
      {
        volumeId: ptVolumeId,
        callback: ({ volumeActor }) =>
          setPetColorMapTransferFunctionForVolumeActor({
            volumeActor,
          }),
      },
    ],
    [viewportId1, viewportId2, viewportId3]
  );

  // Render the image
  renderingEngine.renderViewports([viewportId1, viewportId2, viewportId3]);
}

run();

// Trying to implement 3D Volume Render
// import {
//   ////
//   CONSTANTS,
//   utilities,
//   ////
//   RenderingEngine,
//   Types,
//   Enums,
//   setVolumesForViewports,
//   volumeLoader,
// } from '@cornerstonejs/core';
// import {
//   initDemo,
//   createImageIdsAndCacheMetaData,
//   setTitleAndDescription,
//   setCtTransferFunctionForVolumeActor,
//   setPetColorMapTransferFunctionForVolumeActor,
// } from '../../../../utils/demo/helpers';
// import * as cornerstoneTools from '@cornerstonejs/tools';

// // This is for debugging purposes
// console.warn(
//   'Click on index.ts to open source code for this example --------->'
// );

// const {
//   ////
//   TrackballRotateTool,
//   ////
//   SegmentationDisplayTool,
//   ToolGroupManager,
//   Enums: csToolsEnums,
//   RectangleROIThresholdTool,
//   PanTool,
//   ZoomTool,
//   StackScrollMouseWheelTool,
// } = cornerstoneTools;

// const { MouseBindings } = csToolsEnums;
// const { ViewportType } = Enums;

// // Define a unique id for the volume

// ////
// let renderingEngine;
// const volumeName3d = 'CT_VOLUME_ID'; // Id of the volume less loader prefix
// const volumeLoaderScheme3d = 'cornerstoneStreamingImageVolume';
// const volumeId3d = `${volumeLoaderScheme3d}:${volumeName3d}`; // VolumeId with loader id + volume id
// const renderingEngineId = 'myRenderingEngine';
// const viewportId = '3D_VIEWPORT';
// ////

// const volumeLoaderScheme = 'cornerstoneStreamingImageVolume'; // Loader id which defines which volume loader to use

// const ctVolumeName = 'CT_VOLUME_ID'; // Id of the volume less loader prefix
// const ctVolumeId = `${volumeLoaderScheme}:${ctVolumeName}`; // VolumeId with loader id + volume id
// const ptVolumeName = 'PT_VOLUME_ID';
// const ptVolumeId = `${volumeLoaderScheme}:${ptVolumeName}`;
// const volumeId = ptVolumeId;

// const toolGroupId = 'MY_TOOLGROUP_ID';

// // ======== Set up page ======== //
// setTitleAndDescription(
//   'POSDA Rectangle ROI Threshold Tool',
//   'Here we demonstrate usage of the ROI Threshold tool'
// );

// const size = '500px';
// const content = document.getElementById('content');
// const viewportGrid = document.createElement('div');

// viewportGrid.style.display = 'flex';
// viewportGrid.style.display = 'flex';
// viewportGrid.style.flexDirection = 'row';

// const element1 = document.createElement('div');
// const element2 = document.createElement('div');
// const element3 = document.createElement('div');

// ////
// const element4 = document.createElement('div');
// element4.oncontextmenu = () => false;

// element4.style.width = size;
// element4.style.height = size;

// viewportGrid.appendChild(element4);
// ////

// content.appendChild(viewportGrid);

// element1.style.width = size;
// element1.style.height = size;
// element2.style.width = size;
// element2.style.height = size;
// element3.style.width = size;
// element3.style.height = size;

// // Disable right click context menu so we can have right click tools
// element1.oncontextmenu = (e) => e.preventDefault();
// element2.oncontextmenu = (e) => e.preventDefault();
// element3.oncontextmenu = (e) => e.preventDefault();

// viewportGrid.appendChild(element1);
// viewportGrid.appendChild(element2);
// viewportGrid.appendChild(element3);

// content.appendChild(viewportGrid);

// const instructions = document.createElement('p');
// instructions.innerText = `
//   - Draw a target region with the left click.

//   Middle Click: Pan
//   Right Click: Zoom
//   Mouse wheel: Scroll Stack
//   `;

// content.append(instructions);

// /**
//  * Runs the demo
//  */
// async function run() {
//   // Init Cornerstone and related libraries
//   await initDemo();

//   // Add tools to Cornerstone3D
//   cornerstoneTools.addTool(PanTool);
//   cornerstoneTools.addTool(ZoomTool);
//   cornerstoneTools.addTool(StackScrollMouseWheelTool);
//   cornerstoneTools.addTool(RectangleROIThresholdTool);

//   ////
//   cornerstoneTools.addTool(TrackballRotateTool);
//   ////

//   // Define tool groups to add the segmentation display tool to
//   const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

//   // Manipulation Tools
//   toolGroup.addTool(PanTool.toolName);
//   toolGroup.addTool(ZoomTool.toolName);
//   toolGroup.addTool(StackScrollMouseWheelTool.toolName);

//   ////
//   // Add the tools to the tool group and specify which volume they are pointing at
//   toolGroup.addTool(TrackballRotateTool.toolName, {
//     configuration: { volumeId3d },
//   });

//   // Set the initial state of the tools, here we set one tool active on left click.
//   // This means left click will draw that tool.
//   toolGroup.setToolActive(TrackballRotateTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Primary, // Left Click
//       },
//     ],
//   });
//   ////

//   // Segmentation Tools
//   toolGroup.addTool(RectangleROIThresholdTool.toolName);
//   toolGroup.setToolEnabled(SegmentationDisplayTool.toolName);

//   toolGroup.setToolActive(RectangleROIThresholdTool.toolName, {
//     bindings: [{ mouseButton: MouseBindings.Primary }],
//   });

//   toolGroup.setToolActive(PanTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Auxiliary, // Middle Click
//       },
//     ],
//   });
//   toolGroup.setToolActive(ZoomTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Secondary, // Right Click
//       },
//     ],
//   });
//   // As the Stack Scroll mouse wheel is a tool using the `mouseWheelCallback`
//   // hook instead of mouse buttons, it does not need to assign any mouse button.
//   toolGroup.setToolActive(StackScrollMouseWheelTool.toolName);

//   const wadoRsRoot = 'http://localhost:8042/dicom-web';
//   const StudyInstanceUID = '1.3.6.1.4.1.14519.5.2.1.217716597069695228202996103446901844066';
//   const SeriesInstanceUID = '1.3.6.1.4.1.14519.5.2.1.186848473283379477869709168257845339904';

//   // Get Cornerstone imageIds and fetch metadata into RAM
//   const ctImageIds = await createImageIdsAndCacheMetaData({
//     StudyInstanceUID,
//     SeriesInstanceUID,
//     wadoRsRoot,
//   });

//   const ptImageIds = await createImageIdsAndCacheMetaData({
//     StudyInstanceUID,
//     SeriesInstanceUID,
//     wadoRsRoot,
//   });

//   ////
//   // Get Cornerstone imageIds and fetch metadata into RAM
//   const imageIds = await createImageIdsAndCacheMetaData({
//     StudyInstanceUID,
//     SeriesInstanceUID,
//     wadoRsRoot,
//   });
//   ////

//   // Define a volume in memory
//   const ctVolume = await volumeLoader.createAndCacheVolume(ctVolumeId, {
//     imageIds: ctImageIds,
//   });
//   // Define a volume in memory
//   const ptVolume = await volumeLoader.createAndCacheVolume(ptVolumeId, {
//     imageIds: ptImageIds,
//   });

//   // Instantiate a rendering engine
//   const renderingEngineId = 'myRenderingEngine';
//   const renderingEngine = new RenderingEngine(renderingEngineId);

//   // Create the viewports
//   const viewportId1 = 'CT_AXIAL';
//   const viewportId2 = 'CT_SAGITTAL';
//   const viewportId3 = 'CT_CORONAL';

//   const viewportInputArray = [
//     {
//       viewportId: viewportId1,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element1,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.CORONAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//     {
//       viewportId: viewportId2,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element2,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.SAGITTAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//     {
//       viewportId: viewportId3,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element3,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.AXIAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//     {
//       viewportId: viewportId,
//       type: ViewportType.VOLUME_3D,
//       element: element1,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.CORONAL,
//         background: <Types.Point3>[0.2, 0, 0.2],
//       },
//     },
//   ];

//   renderingEngine.setViewports(viewportInputArray);

//   toolGroup.addViewport(viewportId1, renderingEngineId);
//   toolGroup.addViewport(viewportId2, renderingEngineId);
//   toolGroup.addViewport(viewportId3, renderingEngineId);

//   ////
//   toolGroup.addViewport(viewportId, renderingEngineId);
//   // Set the tool group on the viewports
//   toolGroup.addViewport(viewportId, renderingEngineId);

//   // Define a volume in memory
//   const volume = await volumeLoader.createAndCacheVolume(volumeId, {
//     imageIds,
//   });

//   // Set the volume to load
//   volume.load();

//   setVolumesForViewports(renderingEngine, [{ volumeId }], [viewportId]).then(
//     () => {
//       const volumeActor = renderingEngine
//         .getViewport(viewportId)
//         .getDefaultActor().actor as Types.VolumeActor;

//       utilities.applyPreset(
//         volumeActor,
//         CONSTANTS.VIEWPORT_PRESETS.find((preset) => preset.name === 'CT-Bone')
//       );

//       viewport.render();
//     }
//   );

//   const viewport = renderingEngine.getViewport(viewportId);
//   renderingEngine.render();
//   ////

//   // Set the volumes to load
//   ptVolume.load();
//   ctVolume.load();

//   // Set volumes on the viewports
//   await setVolumesForViewports(
//     renderingEngine,
//     [{ volumeId, callback: setCtTransferFunctionForVolumeActor }],
//     [viewportId1, viewportId2, viewportId3]
//   );

//   await setVolumesForViewports(
//     renderingEngine,
//     [
//       {
//         volumeId: ctVolumeId,
//         callback: setCtTransferFunctionForVolumeActor,
//       },
//       {
//         volumeId: ptVolumeId,
//         callback: ({ volumeActor }) =>
//           setPetColorMapTransferFunctionForVolumeActor({
//             volumeActor,
//           }),
//       },
//     ],
//     [viewportId1, viewportId2, viewportId3]
//   );

//   // Render the image
//   renderingEngine.renderViewports([viewportId1, viewportId2, viewportId3]);
// }

// run();

// Working version!
// import {
//   RenderingEngine,
//   Types,
//   Enums,
//   setVolumesForViewports,
//   volumeLoader,
// } from '@cornerstonejs/core';
// import {
//   initDemo,
//   createImageIdsAndCacheMetaData,
//   setTitleAndDescription,
//   setCtTransferFunctionForVolumeActor,
//   setPetColorMapTransferFunctionForVolumeActor,
// } from '../../../../utils/demo/helpers';
// import * as cornerstoneTools from '@cornerstonejs/tools';

// // This is for debugging purposes
// console.warn(
//   'Click on index.ts to open source code for this example --------->'
// );

// const {
//   SegmentationDisplayTool,
//   ToolGroupManager,
//   Enums: csToolsEnums,
//   RectangleROIThresholdTool,
//   PanTool,
//   ZoomTool,
//   StackScrollMouseWheelTool,
// } = cornerstoneTools;

// const { MouseBindings } = csToolsEnums;
// const { ViewportType } = Enums;

// // Define a unique id for the volume
// const volumeLoaderScheme = 'cornerstoneStreamingImageVolume'; // Loader id which defines which volume loader to use

// const ctVolumeName = 'CT_VOLUME_ID'; // Id of the volume less loader prefix
// const ctVolumeId = `${volumeLoaderScheme}:${ctVolumeName}`; // VolumeId with loader id + volume id
// const ptVolumeName = 'PT_VOLUME_ID';
// const ptVolumeId = `${volumeLoaderScheme}:${ptVolumeName}`;
// const volumeId = ptVolumeId;

// const toolGroupId = 'MY_TOOLGROUP_ID';

// // ======== Set up page ======== //
// setTitleAndDescription(
//   'POSDA Rectangle ROI Threshold Tool',
//   'Here we demonstrate usage of the ROI Threshold tool'
// );

// const size = '500px';
// const content = document.getElementById('content');
// const viewportGrid = document.createElement('div');

// viewportGrid.style.display = 'flex';
// viewportGrid.style.display = 'flex';
// viewportGrid.style.flexDirection = 'row';

// const element1 = document.createElement('div');
// const element2 = document.createElement('div');
// const element3 = document.createElement('div');
// element1.style.width = size;
// element1.style.height = size;
// element2.style.width = size;
// element2.style.height = size;
// element3.style.width = size;
// element3.style.height = size;

// // Disable right click context menu so we can have right click tools
// element1.oncontextmenu = (e) => e.preventDefault();
// element2.oncontextmenu = (e) => e.preventDefault();
// element3.oncontextmenu = (e) => e.preventDefault();

// viewportGrid.appendChild(element1);
// viewportGrid.appendChild(element2);
// viewportGrid.appendChild(element3);

// content.appendChild(viewportGrid);

// const instructions = document.createElement('p');
// instructions.innerText = `
//   - Draw a target region with the left click.

//   Middle Click: Pan
//   Right Click: Zoom
//   Mouse wheel: Scroll Stack
//   `;

// content.append(instructions);

// /**
//  * Runs the demo
//  */
// async function run() {
//   // Init Cornerstone and related libraries
//   await initDemo();

//   // Add tools to Cornerstone3D
//   cornerstoneTools.addTool(PanTool);
//   cornerstoneTools.addTool(ZoomTool);
//   cornerstoneTools.addTool(StackScrollMouseWheelTool);
//   cornerstoneTools.addTool(RectangleROIThresholdTool);

//   // Define tool groups to add the segmentation display tool to
//   const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

//   // Manipulation Tools
//   toolGroup.addTool(PanTool.toolName);
//   toolGroup.addTool(ZoomTool.toolName);
//   toolGroup.addTool(StackScrollMouseWheelTool.toolName);

//   // Segmentation Tools
//   toolGroup.addTool(RectangleROIThresholdTool.toolName);
//   toolGroup.setToolEnabled(SegmentationDisplayTool.toolName);

//   toolGroup.setToolActive(RectangleROIThresholdTool.toolName, {
//     bindings: [{ mouseButton: MouseBindings.Primary }],
//   });

//   toolGroup.setToolActive(PanTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Auxiliary, // Middle Click
//       },
//     ],
//   });
//   toolGroup.setToolActive(ZoomTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Secondary, // Right Click
//       },
//     ],
//   });
//   // As the Stack Scroll mouse wheel is a tool using the `mouseWheelCallback`
//   // hook instead of mouse buttons, it does not need to assign any mouse button.
//   toolGroup.setToolActive(StackScrollMouseWheelTool.toolName);

//   const wadoRsRoot = 'http://localhost:8042/dicom-web';
//   const StudyInstanceUID =
//     '1.3.6.1.4.1.14519.5.2.1.217716597069695228202996103446901844066';

//   // Get Cornerstone imageIds and fetch metadata into RAM
//   const ctImageIds = await createImageIdsAndCacheMetaData({
//     StudyInstanceUID,
//     SeriesInstanceUID:
//       '1.3.6.1.4.1.14519.5.2.1.186848473283379477869709168257845339904',
//     wadoRsRoot,
//   });

//   const ptImageIds = await createImageIdsAndCacheMetaData({
//     StudyInstanceUID,
//     SeriesInstanceUID:
//       '1.3.6.1.4.1.14519.5.2.1.186848473283379477869709168257845339904',
//     wadoRsRoot,
//   });

//   // Define a volume in memory
//   const ctVolume = await volumeLoader.createAndCacheVolume(ctVolumeId, {
//     imageIds: ctImageIds,
//   });
//   // Define a volume in memory
//   const ptVolume = await volumeLoader.createAndCacheVolume(ptVolumeId, {
//     imageIds: ptImageIds,
//   });

//   // Instantiate a rendering engine
//   const renderingEngineId = 'myRenderingEngine';
//   const renderingEngine = new RenderingEngine(renderingEngineId);

//   // Create the viewports
//   const viewportId1 = 'CT_AXIAL';
//   const viewportId2 = 'CT_SAGITTAL';
//   const viewportId3 = 'CT_CORONAL';

//   const viewportInputArray = [
//     {
//       viewportId: viewportId1,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element1,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.CORONAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//     {
//       viewportId: viewportId2,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element2,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.SAGITTAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//     {
//       viewportId: viewportId3,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element3,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.AXIAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//   ];

//   renderingEngine.setViewports(viewportInputArray);

//   toolGroup.addViewport(viewportId1, renderingEngineId);
//   toolGroup.addViewport(viewportId2, renderingEngineId);
//   toolGroup.addViewport(viewportId3, renderingEngineId);

//   // Set the volumes to load
//   ptVolume.load();
//   ctVolume.load();

//   // Set volumes on the viewports
//   await setVolumesForViewports(
//     renderingEngine,
//     [{ volumeId, callback: setCtTransferFunctionForVolumeActor }],
//     [viewportId1, viewportId2, viewportId3]
//   );

//   await setVolumesForViewports(
//     renderingEngine,
//     [
//       {
//         volumeId: ctVolumeId,
//         callback: setCtTransferFunctionForVolumeActor,
//       },
//       {
//         volumeId: ptVolumeId,
//         callback: ({ volumeActor }) =>
//           setPetColorMapTransferFunctionForVolumeActor({
//             volumeActor,
//           }),
//       },
//     ],
//     [viewportId1, viewportId2, viewportId3]
//   );

//   // Render the image
//   renderingEngine.renderViewports([viewportId1, viewportId2, viewportId3]);
// }

// run();

// import {
//   RenderingEngine,
//   Types,
//   Enums,
//   setVolumesForViewports,
//   volumeLoader,
// } from '@cornerstonejs/core';
// import {
//   initDemo,
//   createImageIdsAndCacheMetaData,
//   setTitleAndDescription,
//   setCtTransferFunctionForVolumeActor,
//   setPetColorMapTransferFunctionForVolumeActor,
// } from '../../../../utils/demo/helpers';
// import * as cornerstoneTools from '@cornerstonejs/tools';

// // This is for debugging purposes
// console.warn(
//   'Click on index.ts to open source code for this example --------->'
// );

// const {
//   SegmentationDisplayTool,
//   ToolGroupManager,
//   Enums: csToolsEnums,
//   RectangleROIThresholdTool,
//   PanTool,
//   ZoomTool,
//   StackScrollMouseWheelTool,
// } = cornerstoneTools;

// const { MouseBindings } = csToolsEnums;
// const { ViewportType } = Enums;

// // Define a unique id for the volume
// const volumeLoaderScheme = 'cornerstoneStreamingImageVolume'; // Loader id which defines which volume loader to use

// const ctVolumeName = 'CT_VOLUME_ID'; // Id of the volume less loader prefix
// const ctVolumeId = `${volumeLoaderScheme}:${ctVolumeName}`; // VolumeId with loader id + volume id
// const ptVolumeName = 'PT_VOLUME_ID';
// const ptVolumeId = `${volumeLoaderScheme}:${ptVolumeName}`;
// const volumeId = ptVolumeId;

// const toolGroupId = 'MY_TOOLGROUP_ID';

// // ======== Set up page ======== //
// setTitleAndDescription(
//   'POSDA Rectangle ROI Threshold Tool',
//   'Here we demonstrate usage of the ROI Threshold tool'
// );

// const size = '500px';
// const content = document.getElementById('content');
// const viewportGrid = document.createElement('div');

// viewportGrid.style.display = 'flex';
// viewportGrid.style.display = 'flex';
// viewportGrid.style.flexDirection = 'row';

// const element1 = document.createElement('div');
// const element2 = document.createElement('div');
// const element3 = document.createElement('div');
// element1.style.width = size;
// element1.style.height = size;
// element2.style.width = size;
// element2.style.height = size;
// element3.style.width = size;
// element3.style.height = size;

// // Disable right click context menu so we can have right click tools
// element1.oncontextmenu = (e) => e.preventDefault();
// element2.oncontextmenu = (e) => e.preventDefault();
// element3.oncontextmenu = (e) => e.preventDefault();

// viewportGrid.appendChild(element1);
// viewportGrid.appendChild(element2);
// viewportGrid.appendChild(element3);

// content.appendChild(viewportGrid);

// const instructions = document.createElement('p');
// instructions.innerText = `
//   - Draw a target region with the left click.

//   Middle Click: Pan
//   Right Click: Zoom
//   Mouse wheel: Scroll Stack
//   `;

// content.append(instructions);

// /**
//  * Runs the demo
//  */
// async function run() {
//   // Init Cornerstone and related libraries
//   await initDemo();

//   // Add tools to Cornerstone3D
//   cornerstoneTools.addTool(PanTool);
//   cornerstoneTools.addTool(ZoomTool);
//   cornerstoneTools.addTool(StackScrollMouseWheelTool);
//   cornerstoneTools.addTool(RectangleROIThresholdTool);

//   // Define tool groups to add the segmentation display tool to
//   const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

//   // Manipulation Tools
//   toolGroup.addTool(PanTool.toolName);
//   toolGroup.addTool(ZoomTool.toolName);
//   toolGroup.addTool(StackScrollMouseWheelTool.toolName);

//   // Segmentation Tools
//   toolGroup.addTool(RectangleROIThresholdTool.toolName);
//   toolGroup.setToolEnabled(SegmentationDisplayTool.toolName);

//   toolGroup.setToolActive(RectangleROIThresholdTool.toolName, {
//     bindings: [{ mouseButton: MouseBindings.Primary }],
//   });

//   toolGroup.setToolActive(PanTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Auxiliary, // Middle Click
//       },
//     ],
//   });
//   toolGroup.setToolActive(ZoomTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Secondary, // Right Click
//       },
//     ],
//   });
//   // As the Stack Scroll mouse wheel is a tool using the `mouseWheelCallback`
//   // hook instead of mouse buttons, it does not need to assign any mouse button.
//   toolGroup.setToolActive(StackScrollMouseWheelTool.toolName);

//   // Define your DICOMWeb server URL and StudyInstanceUID
//   const wadoRsRoot = 'http://localhost:4000/dicomweb'; // Replace with your server URL
//   const StudyInstanceUID = 'Your-Study-Instance-UID'; // Replace with the StudyInstanceUID of your study

//   // Create imageIds based on WADO-URI URLs for your study
//   const ctImageIds = await createImageIdsAndCacheMetaData({
//     StudyInstanceUID,
//     SeriesInstanceUID: 'Your-CT-Series-Instance-UID', // Replace with the SeriesInstanceUID of your CT series
//     wadoRsRoot,
//   });

//   const ptImageIds = await createImageIdsAndCacheMetaData({
//     StudyInstanceUID,
//     SeriesInstanceUID: 'Your-PT-Series-Instance-UID', // Replace with the SeriesInstanceUID of your PT series
//     wadoRsRoot,
//   });

//   // Define a volume in memory
//   const ctVolume = await volumeLoader.createAndCacheVolume(ctVolumeId, {
//     imageIds: ctImageIds,
//   });
//   // Define a volume in memory
//   const ptVolume = await volumeLoader.createAndCacheVolume(ptVolumeId, {
//     imageIds: ptImageIds,
//   });

//   // Instantiate a rendering engine
//   const renderingEngineId = 'myRenderingEngine';
//   const renderingEngine = new RenderingEngine(renderingEngineId);

//   // Create the viewports
//   const viewportId1 = 'CT_AXIAL';
//   const viewportId2 = 'CT_SAGITTAL';
//   const viewportId3 = 'CT_CORONAL';

//   const viewportInputArray = [
//     {
//       viewportId: viewportId1,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element1,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.CORONAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//     {
//       viewportId: viewportId2,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element2,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.SAGITTAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//     {
//       viewportId: viewportId3,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element3,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.AXIAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//   ];

//   renderingEngine.setViewports(viewportInputArray);

//   toolGroup.addViewport(viewportId1, renderingEngineId);
//   toolGroup.addViewport(viewportId2, renderingEngineId);
//   toolGroup.addViewport(viewportId3, renderingEngineId);

//   // Set the volumes to load
//   ptVolume.load(ctImageIds); // Load PT images
//   ctVolume.load(ptImageIds); // Load CT images

//   // Set volumes on the viewports
//   await setVolumesForViewports(
//     renderingEngine,
//     [{ volumeId, callback: setCtTransferFunctionForVolumeActor }],
//     [viewportId1, viewportId2, viewportId3]
//   );

//   await setVolumesForViewports(
//     renderingEngine,
//     [
//       {
//         volumeId: ctVolumeId,
//         callback: setCtTransferFunctionForVolumeActor,
//       },
//       {
//         volumeId: ptVolumeId,
//         callback: ({ volumeActor }) =>
//           setPetColorMapTransferFunctionForVolumeActor({
//             volumeActor,
//           }),
//       },
//     ],
//     [viewportId1, viewportId2, viewportId3]
//   );

//   // Render the image
//   renderingEngine.renderViewports([viewportId1, viewportId2, viewportId3]);
// }

// run();

// import {
//   RenderingEngine,
//   Types,
//   Enums,
//   setVolumesForViewports,
//   volumeLoader,
// } from '@cornerstonejs/core';
// import {
//   initDemo,
//   createImageIdsAndCacheMetaData,
//   setTitleAndDescription,
//   setCtTransferFunctionForVolumeActor,
//   setPetColorMapTransferFunctionForVolumeActor,
// } from '../../../../utils/demo/helpers';
// import * as cornerstoneTools from '@cornerstonejs/tools';

// // This is for debugging purposes
// console.warn(
//   'Click on index.ts to open source code for this example --------->'
// );

// const {
//   SegmentationDisplayTool,
//   ToolGroupManager,
//   Enums: csToolsEnums,
//   RectangleROIThresholdTool,
//   PanTool,
//   ZoomTool,
//   StackScrollMouseWheelTool,
// } = cornerstoneTools;

// const { MouseBindings } = csToolsEnums;
// const { ViewportType } = Enums;

// // Define a unique id for the volume
// const volumeLoaderScheme = 'cornerstoneStreamingImageVolume'; // Loader id which defines which volume loader to use

// const ctVolumeName = 'CT_VOLUME_ID'; // Id of the volume less loader prefix
// const ctVolumeId = `${volumeLoaderScheme}:${ctVolumeName}`; // VolumeId with loader id + volume id
// const ptVolumeName = 'PT_VOLUME_ID';
// const ptVolumeId = `${volumeLoaderScheme}:${ptVolumeName}`;
// const volumeId = ptVolumeId;

// const toolGroupId = 'MY_TOOLGROUP_ID';

// // ======== Set up page ======== //
// setTitleAndDescription(
//   'POSDA Rectangle ROI Threshold Tool',
//   'Here we demonstrate usage of the ROI Threshold tool'
// );

// const size = '500px';
// const content = document.getElementById('content');
// const viewportGrid = document.createElement('div');

// viewportGrid.style.display = 'flex';
// viewportGrid.style.display = 'flex';
// viewportGrid.style.flexDirection = 'row';

// const element1 = document.createElement('div');
// const element2 = document.createElement('div');
// const element3 = document.createElement('div');
// element1.style.width = size;
// element1.style.height = size;
// element2.style.width = size;
// element2.style.height = size;
// element3.style.width = size;
// element3.style.height = size;

// // Disable right click context menu so we can have right click tools
// element1.oncontextmenu = (e) => e.preventDefault();
// element2.oncontextmenu = (e) => e.preventDefault();
// element3.oncontextmenu = (e) => e.preventDefault();

// viewportGrid.appendChild(element1);
// viewportGrid.appendChild(element2);
// viewportGrid.appendChild(element3);

// content.appendChild(viewportGrid);

// const instructions = document.createElement('p');
// instructions.innerText = `
//   - Draw a target region with the left click.

//   Middle Click: Pan
//   Right Click: Zoom
//   Mouse wheel: Scroll Stack
//   `;

// content.append(instructions);

// /**
//  * Runs the demo
//  */
// async function run() {
//   // Init Cornerstone and related libraries
//   await initDemo();

//   // Add tools to Cornerstone3D
//   cornerstoneTools.addTool(PanTool);
//   cornerstoneTools.addTool(ZoomTool);
//   cornerstoneTools.addTool(StackScrollMouseWheelTool);
//   cornerstoneTools.addTool(RectangleROIThresholdTool);

//   // Define tool groups to add the segmentation display tool to
//   const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

//   // Manipulation Tools
//   toolGroup.addTool(PanTool.toolName);
//   toolGroup.addTool(ZoomTool.toolName);
//   toolGroup.addTool(StackScrollMouseWheelTool.toolName);

//   // Segmentation Tools
//   toolGroup.addTool(RectangleROIThresholdTool.toolName);
//   toolGroup.setToolEnabled(SegmentationDisplayTool.toolName);

//   toolGroup.setToolActive(RectangleROIThresholdTool.toolName, {
//     bindings: [{ mouseButton: MouseBindings.Primary }],
//   });

//   toolGroup.setToolActive(PanTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Auxiliary, // Middle Click
//       },
//     ],
//   });
//   toolGroup.setToolActive(ZoomTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Secondary, // Right Click
//       },
//     ],
//   });
//   // As the Stack Scroll mouse wheel is a tool using the `mouseWheelCallback`
//   // hook instead of mouse buttons, it does not need to assign any mouse button.
//   toolGroup.setToolActive(StackScrollMouseWheelTool.toolName);

//   const wadoRsRoot = 'https://domvja9iplmyu.cloudfront.net/dicomweb';
//   const StudyInstanceUID =
//     '1.3.6.1.4.1.14519.5.2.1.7009.2403.871108593056125491804754960339';

//   // Get Cornerstone imageIds and fetch metadata into RAM
//   const ctImageIds = await createImageIdsAndCacheMetaData({
//     StudyInstanceUID,
//     SeriesInstanceUID:
//       '1.3.6.1.4.1.14519.5.2.1.7009.2403.367700692008930469189923116409',
//     wadoRsRoot,
//   });

//   const ptImageIds = await createImageIdsAndCacheMetaData({
//     StudyInstanceUID,
//     SeriesInstanceUID:
//       '1.3.6.1.4.1.14519.5.2.1.7009.2403.780462962868572737240023906400',
//     wadoRsRoot,
//   });

//   // Define a volume in memory
//   const ctVolume = await volumeLoader.createAndCacheVolume(ctVolumeId, {
//     imageIds: ctImageIds,
//   });
//   // Define a volume in memory
//   const ptVolume = await volumeLoader.createAndCacheVolume(ptVolumeId, {
//     imageIds: ptImageIds,
//   });

//   // Instantiate a rendering engine
//   const renderingEngineId = 'myRenderingEngine';
//   const renderingEngine = new RenderingEngine(renderingEngineId);

//   // Create the viewports
//   const viewportId1 = 'CT_AXIAL';
//   const viewportId2 = 'CT_SAGITTAL';
//   const viewportId3 = 'CT_CORONAL';

//   const viewportInputArray = [
//     {
//       viewportId: viewportId1,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element1,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.CORONAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//     {
//       viewportId: viewportId2,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element2,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.SAGITTAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//     {
//       viewportId: viewportId3,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element3,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.AXIAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//   ];

//   renderingEngine.setViewports(viewportInputArray);

//   toolGroup.addViewport(viewportId1, renderingEngineId);
//   toolGroup.addViewport(viewportId2, renderingEngineId);
//   toolGroup.addViewport(viewportId3, renderingEngineId);

//   // Set the volumes to load
//   ptVolume.load();
//   ctVolume.load();

//   // Set volumes on the viewports
//   await setVolumesForViewports(
//     renderingEngine,
//     [{ volumeId, callback: setCtTransferFunctionForVolumeActor }],
//     [viewportId1, viewportId2, viewportId3]
//   );

//   await setVolumesForViewports(
//     renderingEngine,
//     [
//       {
//         volumeId: ctVolumeId,
//         callback: setCtTransferFunctionForVolumeActor,
//       },
//       {
//         volumeId: ptVolumeId,
//         callback: ({ volumeActor }) =>
//           setPetColorMapTransferFunctionForVolumeActor({
//             volumeActor,
//           }),
//       },
//     ],
//     [viewportId1, viewportId2, viewportId3]
//   );

//   // Render the image
//   renderingEngine.renderViewports([viewportId1, viewportId2, viewportId3]);
// }

// run();

// import {
//   // cache,
//   RenderingEngine,
//   Types,
//   Enums,
//   setVolumesForViewports,
//   volumeLoader,
// } from '@cornerstonejs/core';
// import {
//   initDemo,
//   createImageIdsAndCacheMetaData,
//   setTitleAndDescription,
//   // addButtonToToolbar,
//   // addSliderToToolbar,
//   // addDropdownToToolbar,
//   setCtTransferFunctionForVolumeActor,
//   setPetColorMapTransferFunctionForVolumeActor,
// } from '../../../../utils/demo/helpers';
// import * as cornerstoneTools from '@cornerstonejs/tools';
// // import perfusionColorMap from '../../../../packages/tools/examples/rectangleROIThreshold/preset.js';

// // This is for debugging purposes
// console.warn(
//   'Click on index.ts to open source code for this example --------->'
// );

// const {
//   SegmentationDisplayTool,
//   ToolGroupManager,
//   Enums: csToolsEnums,
//   // segmentation,
//   RectangleROIThresholdTool,
//   PanTool,
//   ZoomTool,
//   StackScrollMouseWheelTool,
//   // annotation,
//   // utilities: csToolsUtils,
// } = cornerstoneTools;

// // const { selection } = annotation;
// const { MouseBindings } = csToolsEnums;
// const { ViewportType } = Enums;

// // Define a unique id for the volume
// // const volumeName = 'CT_VOLUME_ID'; // Id of the volume less loader prefix
// const volumeLoaderScheme = 'cornerstoneStreamingImageVolume'; // Loader id which defines which volume loader to use

// const ctVolumeName = 'CT_VOLUME_ID'; // Id of the volume less loader prefix
// const ctVolumeId = `${volumeLoaderScheme}:${ctVolumeName}`; // VolumeId with loader id + volume id
// const ptVolumeName = 'PT_VOLUME_ID';
// const ptVolumeId = `${volumeLoaderScheme}:${ptVolumeName}`;
// const volumeId = ptVolumeId;

// // const segmentationId = 'MY_SEGMENTATION_ID';
// const toolGroupId = 'MY_TOOLGROUP_ID';

// // let segmentationRepresentationByUID;

// // ======== Set up page ======== //
// setTitleAndDescription(
//   'POSDA Rectangle ROI Threshold Tool',
//   'Here we demonstrate usage of the ROI Threshold tool'
// );

// const size = '500px';
// const content = document.getElementById('content');
// const viewportGrid = document.createElement('div');

// viewportGrid.style.display = 'flex';
// viewportGrid.style.display = 'flex';
// viewportGrid.style.flexDirection = 'row';

// const element1 = document.createElement('div');
// const element2 = document.createElement('div');
// const element3 = document.createElement('div');
// element1.style.width = size;
// element1.style.height = size;
// element2.style.width = size;
// element2.style.height = size;
// element3.style.width = size;
// element3.style.height = size;

// // Disable right click context menu so we can have right click tools
// element1.oncontextmenu = (e) => e.preventDefault();
// element2.oncontextmenu = (e) => e.preventDefault();
// element3.oncontextmenu = (e) => e.preventDefault();

// viewportGrid.appendChild(element1);
// viewportGrid.appendChild(element2);
// viewportGrid.appendChild(element3);

// content.appendChild(viewportGrid);

// const instructions = document.createElement('p');
// instructions.innerText = `
//   - Draw a target region with the left click.

//   Middle Click: Pan
//   Right Click: Zoom
//   Mouse wheel: Scroll Stack
//   `;

// content.append(instructions);

// // ============================= //

// // const numSlicesToProject = 3;
// // const ctLowerThreshold = -900;
// // const ctUpperThreshold = -700;
// // const overwrite = true;

// // const ptLowerThreshold = 0;
// // const ptUpperThreshold = 5;
// // const overlapType = 0;

// // addDropdownToToolbar({
// //   options: {
// //     values: ['All voxels', 'Any voxel'],
// //     defaultValue: 'Any voxel',
// //   },
// //   onSelectedValueChange: (selectedValue) => {
// //     if (selectedValue === 'All voxels') {
// //       overlapType = 1;
// //     } else if (selectedValue === 'Any voxel') {
// //       overlapType = 0;
// //     }
// //   },
// // });

// // addButtonToToolbar({
// //   title: 'Execute threshold',
// //   onClick: () => {
// //     const selectedAnnotationUIDs = selection.getAnnotationsSelectedByToolName(
// //       RectangleROIThresholdTool.toolName
// //     ) as Array<string>;

// //     if (!selectedAnnotationUIDs) {
// //       throw new Error('No annotation selected ');
// //     }

// //     const annotationUID = selectedAnnotationUIDs[0];
// //     const annotation = cornerstoneTools.annotation.state.getAnnotation(
// //       annotationUID
// //     ) as cornerstoneTools.Types.ToolSpecificAnnotationTypes.RectangleROIThresholdAnnotation;

// //     if (!annotation) {
// //       return;
// //     }

// //     // Todo: this only works for volumeViewport
// //     const ctVolume = cache.getVolume(ctVolumeId);
// //     const ptVolume = cache.getVolume(ptVolumeId);
// //     const segmentationVolume = cache.getVolume(segmentationId);

// //     csToolsUtils.segmentation.rectangleROIThresholdVolumeByRange(
// //       selectedAnnotationUIDs,
// //       segmentationVolume,
// //       [
// //         { volume: ctVolume, lower: ctLowerThreshold, upper: ctUpperThreshold },
// //         { volume: ptVolume, lower: ptLowerThreshold, upper: ptUpperThreshold },
// //       ],
// //       {
// //         numSlicesToProject,
// //         overwrite,
// //         overlapType,
// //       }
// //     );
// //   },
// // });

// // addSliderToToolbar({
// //   title: `#Slices to Segment: ${numSlicesToProject}`,
// //   range: [1, 10],
// //   defaultValue: numSlicesToProject,
// //   onSelectedValueChange: (value) => {
// //     numSlicesToProject = Number(value);
// //   },
// //   updateLabelOnChange: (value, label) => {
// //     label.innerText = `#Slices to Segment: ${value}`;
// //   },
// // });

// // addSliderToToolbar({
// //   title: `PT Lower Thresh: ${ptLowerThreshold}`,
// //   range: [0, 10],
// //   defaultValue: ptLowerThreshold,
// //   onSelectedValueChange: (value) => {
// //     ptLowerThreshold = Number(value);
// //   },
// //   updateLabelOnChange: (value, label) => {
// //     label.innerText = `PT Lower Thresh: ${value}`;
// //   },
// // });

// // addSliderToToolbar({
// //   title: `PT Upper Thresh: ${ptUpperThreshold}`,
// //   range: [0, 10],
// //   defaultValue: ptUpperThreshold,
// //   onSelectedValueChange: (value) => {
// //     ptUpperThreshold = Number(value);
// //   },
// //   updateLabelOnChange: (value, label) => {
// //     label.innerText = `PT Upper Thresh: ${value}`;
// //   },
// // });

// // addSliderToToolbar({
// //   title: `CT Lower Thresh: ${ctLowerThreshold}`,
// //   range: [-1000, 1000],
// //   defaultValue: ctLowerThreshold,
// //   onSelectedValueChange: (value) => {
// //     ctLowerThreshold = Number(value);
// //   },
// //   updateLabelOnChange: (value, label) => {
// //     label.innerText = `CT Lower Thresh: ${value}`;
// //   },
// // });

// // addSliderToToolbar({
// //   title: `CT Upper Thresh: ${ctUpperThreshold}`,
// //   range: [-1000, 1000],
// //   defaultValue: ctUpperThreshold,
// //   onSelectedValueChange: (value) => {
// //     ctUpperThreshold = Number(value);
// //   },
// //   updateLabelOnChange: (value, label) => {
// //     label.innerText = `CT Upper Thresh: ${value}`;
// //   },
// // });

// // // ============================= //

// // async function addSegmentationsToState() {
// //   // Create a segmentation of the same resolution as the source data
// //   await volumeLoader.createAndCacheDerivedSegmentationVolume(volumeId, {
// //     volumeId: segmentationId,
// //   });

// //   // Add the segmentations to state
// //   segmentation.addSegmentations([
// //     {
// //       segmentationId,
// //       representation: {
// //         // The type of segmentation
// //         type: csToolsEnums.SegmentationRepresentations.Labelmap,
// //         // The actual segmentation data, in the case of labelmap this is a
// //         // reference to the source volume of the segmentation.
// //         data: {
// //           volumeId: segmentationId,
// //         },
// //       },
// //     },
// //   ]);
// // }

// /**
//  * Runs the demo
//  */
// async function run() {
//   // Init Cornerstone and related libraries
//   await initDemo();

//   // Add tools to Cornerstone3D
//   cornerstoneTools.addTool(PanTool);
//   cornerstoneTools.addTool(ZoomTool);
//   cornerstoneTools.addTool(StackScrollMouseWheelTool);
//   // cornerstoneTools.addTool(SegmentationDisplayTool);
//   cornerstoneTools.addTool(RectangleROIThresholdTool);

//   // Define tool groups to add the segmentation display tool to
//   const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

//   // Manipulation Tools
//   toolGroup.addTool(PanTool.toolName);
//   toolGroup.addTool(ZoomTool.toolName);
//   toolGroup.addTool(StackScrollMouseWheelTool.toolName);

//   // Segmentation Tools
//   // toolGroup.addTool(SegmentationDisplayTool.toolName);
//   toolGroup.addTool(RectangleROIThresholdTool.toolName);
//   toolGroup.setToolEnabled(SegmentationDisplayTool.toolName);

//   toolGroup.setToolActive(RectangleROIThresholdTool.toolName, {
//     bindings: [{ mouseButton: MouseBindings.Primary }],
//   });

//   toolGroup.setToolActive(PanTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Auxiliary, // Middle Click
//       },
//     ],
//   });
//   toolGroup.setToolActive(ZoomTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Secondary, // Right Click
//       },
//     ],
//   });
//   // As the Stack Scroll mouse wheel is a tool using the `mouseWheelCallback`
//   // hook instead of mouse buttons, it does not need to assign any mouse button.
//   toolGroup.setToolActive(StackScrollMouseWheelTool.toolName);

//   const wadoRsRoot = 'https://domvja9iplmyu.cloudfront.net/dicomweb';
//   const StudyInstanceUID =
//     '1.3.6.1.4.1.14519.5.2.1.7009.2403.871108593056125491804754960339';

//   // Get Cornerstone imageIds and fetch metadata into RAM
//   const ctImageIds = await createImageIdsAndCacheMetaData({
//     StudyInstanceUID,
//     SeriesInstanceUID:
//       '1.3.6.1.4.1.14519.5.2.1.7009.2403.367700692008930469189923116409',
//     wadoRsRoot,
//   });

//   const ptImageIds = await createImageIdsAndCacheMetaData({
//     StudyInstanceUID,
//     SeriesInstanceUID:
//       '1.3.6.1.4.1.14519.5.2.1.7009.2403.780462962868572737240023906400',
//     wadoRsRoot,
//   });

//   // Define a volume in memory
//   const ctVolume = await volumeLoader.createAndCacheVolume(ctVolumeId, {
//     imageIds: ctImageIds,
//   });
//   // Define a volume in memory
//   const ptVolume = await volumeLoader.createAndCacheVolume(ptVolumeId, {
//     imageIds: ptImageIds,
//   });

//   // Add some segmentations based on the source data volume
//   // await addSegmentationsToState();

//   // Instantiate a rendering engine
//   const renderingEngineId = 'myRenderingEngine';
//   const renderingEngine = new RenderingEngine(renderingEngineId);

//   // Create the viewports
//   const viewportId1 = 'CT_AXIAL';
//   const viewportId2 = 'CT_SAGITTAL';
//   const viewportId3 = 'CT_CORONAL';

//   const viewportInputArray = [
//     {
//       viewportId: viewportId1,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element1,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.CORONAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//     {
//       viewportId: viewportId2,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element2,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.SAGITTAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//     {
//       viewportId: viewportId3,
//       type: ViewportType.ORTHOGRAPHIC,
//       element: element3,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.AXIAL,
//         background: <Types.Point3>[0, 0, 0],
//       },
//     },
//   ];

//   renderingEngine.setViewports(viewportInputArray);

//   toolGroup.addViewport(viewportId1, renderingEngineId);
//   toolGroup.addViewport(viewportId2, renderingEngineId);
//   toolGroup.addViewport(viewportId3, renderingEngineId);

//   // Set the volumes to load
//   ptVolume.load();
//   ctVolume.load();

//   // Set volumes on the viewports
//   await setVolumesForViewports(
//     renderingEngine,
//     [{ volumeId, callback: setCtTransferFunctionForVolumeActor }],
//     [viewportId1, viewportId2, viewportId3]
//   );

//   await setVolumesForViewports(
//     renderingEngine,
//     [
//       {
//         volumeId: ctVolumeId,
//         callback: setCtTransferFunctionForVolumeActor,
//       },
//       {
//         volumeId: ptVolumeId,
//         callback: ({ volumeActor }) =>
//           setPetColorMapTransferFunctionForVolumeActor({
//             volumeActor,
//             // preset: perfusionColorMap,
//           }),
//       },
//     ],
//     [viewportId1, viewportId2, viewportId3]
//   );

//   // // Add the segmentation representation to the toolgroup
//   // const segmentationRepresentationByUIDs =
//   //   await segmentation.addSegmentationRepresentations(toolGroupId, [
//   //     {
//   //       segmentationId,
//   //       type: csToolsEnums.SegmentationRepresentations.Labelmap,
//   //     },
//   //   ]);

//   // segmentationRepresentationByUID = segmentationRepresentationByUIDs[0];

//   // Render the image
//   renderingEngine.renderViewports([viewportId1, viewportId2, viewportId3]);
// }

// run();

// import {
//   CONSTANTS,
//   Enums,
//   getRenderingEngine,
//   RenderingEngine,
//   setVolumesForViewports,
//   Types,
//   utilities,
//   volumeLoader,
// } from '@cornerstonejs/core';
// import * as cornerstoneTools from '@cornerstonejs/tools';
// import {
//   addButtonToToolbar,
//   addDropdownToToolbar,
//   initDemo,
//   setTitleAndDescription,
// } from '../../../../utils/demo/helpers';
// import dicomParser from 'dicom-parser';

// console.warn(
//   'Click on index.ts to open source code for this example --------->'
// );

// const {
//   ToolGroupManager,
//   TrackballRotateTool,
//   Enums: csToolsEnums,
// } = cornerstoneTools;

// const { ViewportType } = Enums;
// const { MouseBindings } = csToolsEnums;

// let renderingEngine;
// const volumeName = 'CT_VOLUME_ID';
// const volumeLoaderScheme = 'cornerstoneDICOMImageLoader';
// const volumeId = `${volumeLoaderScheme}:${volumeName}`;
// const renderingEngineId = 'myRenderingEngine';
// const axialViewportId = 'AXIAL_VIEWPORT';
// const sagittalViewportId = 'SAGITTAL_VIEWPORT';

// setTitleAndDescription(
//   'POSDA DICOM 3D Volume Rendering',
//   'Here we demonstrate how to 3D render a volume.'
// );

// const size = '500px';
// const content = document.getElementById('content');
// const viewportGrid = document.createElement('div');

// viewportGrid.style.display = 'flex';
// viewportGrid.style.display = 'flex';
// viewportGrid.style.flexDirection = 'row';

// const element1 = document.createElement('div');
// element1.oncontextmenu = () => false;
// element1.style.width = size;
// element1.style.height = size;

// const element2 = document.createElement('div');
// element2.oncontextmenu = () => false;
// element2.style.width = size;
// element2.style.height = size;

// viewportGrid.appendChild(element1);
// viewportGrid.appendChild(element2);

// content.appendChild(viewportGrid);

// const instructions = document.createElement('p');
// instructions.innerText = 'Click the image to rotate it.';

// content.append(instructions);

// addButtonToToolbar({
//   title: 'Apply random rotation',
//   onClick: () => {
//     const renderingEngine = getRenderingEngine(renderingEngineId);
//     const viewport = <Types.IVolumeViewport>(
//       renderingEngine.getViewport(axialViewportId)
//     );
//     viewport.setProperties({ rotation: Math.random() * 360 });
//     viewport.render();
//   },
// });

// addDropdownToToolbar({
//   options: {
//     values: CONSTANTS.VIEWPORT_PRESETS.map((preset) => preset.name),
//     defaultValue: 'CT-Bone',
//   },
//   onSelectedValueChange: (presetName) => {
//     const axialVolumeActor = renderingEngine
//       .getViewport(axialViewportId)
//       .getDefaultActor().actor as Types.VolumeActor;
//     utilities.applyPreset(
//       axialVolumeActor,
//       CONSTANTS.VIEWPORT_PRESETS.find((preset) => preset.name === presetName)
//     );
//     renderingEngine.render();
//   },
// });

// async function run() {
//   await initDemo();

//   const toolGroupId = 'TOOL_GROUP_ID';

//   cornerstoneTools.addTool(TrackballRotateTool);

//   const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

//   toolGroup.addTool(TrackballRotateTool.toolName, {
//     configuration: { volumeId },
//   });

//   toolGroup.setToolActive(TrackballRotateTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Primary,
//       },
//     ],
//   });

//   renderingEngine = new RenderingEngine(renderingEngineId);

//   const viewportInputArray = [
//     {
//       viewportId: axialViewportId,
//       type: ViewportType.VOLUME_3D,
//       element: element1,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.CORONAL,
//         background: [255, 255, 255],
//       },
//     },
//     {
//       viewportId: sagittalViewportId,
//       type: ViewportType.VOLUME_3D,
//       element: element2,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.SAGITTAL,
//         background: [255, 255, 255],
//       },
//     },
//   ];

//   renderingEngine.setViewports(viewportInputArray);

//   toolGroup.addViewport(axialViewportId, renderingEngineId);
//   toolGroup.addViewport(sagittalViewportId, renderingEngineId);

//   // Create a file input element
//   const fileInput = document.createElement('input');
//   fileInput.type = 'file';
//   fileInput.multiple = true;
//   fileInput.accept = '.dcm'; // Set to accept only DICOM files

//   // Handle file selection
//   fileInput.addEventListener('change', async (event) => {
//     const files = (event.target as HTMLInputElement).files;
//     if (files && files.length > 0) {
//       const imageIds = [];
//       for (const file of files) {
//         const reader = new FileReader();
//         reader.onload = (e) => {
//           // Parse DICOM file using dicom-parser
//           const byteArray = new Uint8Array(e.target.result as ArrayBuffer);
//           const dataSet = dicomParser.parseDicom(byteArray);

//           // Check if required properties are available
//           const pixelRepresentation = dataSet.uint16('x00280103');
//           const bitsAllocated = dataSet.uint16('x00280100');
//           const pixelData = dataSet.elements.x7fe00010;

//           if (
//             pixelRepresentation !== undefined &&
//             bitsAllocated !== undefined &&
//             pixelData !== undefined
//           ) {
//             const imageId = `dicom:${dataSet.string(
//               'x0020000d'
//             )},${dataSet.string('x00080018')}`;
//             imageIds.push(imageId);
//           }
//         };
//         reader.readAsArrayBuffer(file);
//       }

//       console.log(imageIds);

//       const volume = await volumeLoader.createAndCacheVolume(volumeId, {
//         imageIds,
//       });

//       renderingEngine.addVolume(volume);

//       setVolumesForViewports(
//         renderingEngine,
//         [volume],
//         [axialViewportId, sagittalViewportId]
//       ).then(() => {
//         const axialVolumeActor = renderingEngine
//           .getViewport(axialViewportId)
//           .getDefaultActor().actor as Types.VolumeActor;

//         const sagittalVolumeActor = renderingEngine
//           .getViewport(sagittalViewportId)
//           .getDefaultActor().actor as Types.VolumeActor;

//         utilities.applyPreset(
//           axialVolumeActor,
//           CONSTANTS.VIEWPORT_PRESETS.find((preset) => preset.name === 'CT-Bone')
//         );

//         utilities.applyPreset(
//           sagittalVolumeActor,
//           CONSTANTS.VIEWPORT_PRESETS.find((preset) => preset.name === 'CT-Bone')
//         );

//         renderingEngine.render();
//       });
//     }
//   });

//   content.appendChild(fileInput);

//   const axialViewport = renderingEngine.getViewport(axialViewportId);
//   const sagittalViewport = renderingEngine.getViewport(sagittalViewportId);

//   renderingEngine.render();
// }

// run();

// import {
//   CONSTANTS,
//   Enums,
//   getRenderingEngine,
//   RenderingEngine,
//   setVolumesForViewports,
//   Types,
//   utilities,
//   volumeLoader,
// } from '@cornerstonejs/core';
// import * as cornerstoneTools from '@cornerstonejs/tools';
// import {
//   addButtonToToolbar,
//   addDropdownToToolbar,
//   initDemo,
//   setTitleAndDescription,
// } from '../../../../utils/demo/helpers';
// import dicomImageLoader from '@cornerstonejs/dicom-image-loader';

// console.warn(
//   'Click on index.ts to open source code for this example --------->'
// );

// const {
//   ToolGroupManager,
//   TrackballRotateTool,
//   Enums: csToolsEnums,
// } = cornerstoneTools;

// const { ViewportType } = Enums;
// const { MouseBindings } = csToolsEnums;

// let renderingEngine;
// const volumeName = 'CT_VOLUME_ID';
// const volumeLoaderScheme = 'dicomImageLoader'; // Use dicomImageLoader
// const volumeId = `${volumeLoaderScheme}:${volumeName}`;
// const renderingEngineId = 'myRenderingEngine';
// const axialViewportId = 'AXIAL_VIEWPORT';
// const sagittalViewportId = 'SAGITTAL_VIEWPORT';

// setTitleAndDescription(
//   'POSDA DICOM 3D Volume Rendering',
//   'Here we demonstrate how to 3D render a volume.'
// );

// const size = '500px';
// const content = document.getElementById('content');
// const viewportGrid = document.createElement('div');

// viewportGrid.style.display = 'flex';
// viewportGrid.style.display = 'flex';
// viewportGrid.style.flexDirection = 'row';

// const element1 = document.createElement('div');
// element1.oncontextmenu = () => false;
// element1.style.width = size;
// element1.style.height = size;

// const element2 = document.createElement('div');
// element2.oncontextmenu = () => false;
// element2.style.width = size;
// element2.style.height = size;

// viewportGrid.appendChild(element1);
// viewportGrid.appendChild(element2);

// content.appendChild(viewportGrid);

// const instructions = document.createElement('p');
// instructions.innerText = 'Click the image to rotate it.';

// content.append(instructions);

// addButtonToToolbar({
//   title: 'Apply random rotation',
//   onClick: () => {
//     const renderingEngine = getRenderingEngine(renderingEngineId);
//     const viewport = <Types.IVolumeViewport>(
//       renderingEngine.getViewport(axialViewportId)
//     );
//     viewport.setProperties({ rotation: Math.random() * 360 });
//     viewport.render();
//   },
// });

// addDropdownToToolbar({
//   options: {
//     values: CONSTANTS.VIEWPORT_PRESETS.map((preset) => preset.name),
//     defaultValue: 'CT-Bone',
//   },
//   onSelectedValueChange: (presetName) => {
//     const axialVolumeActor = renderingEngine
//       .getViewport(axialViewportId)
//       .getDefaultActor().actor as Types.VolumeActor;
//     utilities.applyPreset(
//       axialVolumeActor,
//       CONSTANTS.VIEWPORT_PRESETS.find((preset) => preset.name === presetName)
//     );
//     renderingEngine.render();
//   },
// });

// async function run() {
//   await initDemo();

//   const toolGroupId = 'TOOL_GROUP_ID';

//   cornerstoneTools.addTool(TrackballRotateTool);

//   const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

//   toolGroup.addTool(TrackballRotateTool.toolName, {
//     configuration: { volumeId },
//   });

//   toolGroup.setToolActive(TrackballRotateTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Primary,
//       },
//     ],
//   });

//   renderingEngine = new RenderingEngine(renderingEngineId);

//   const viewportInputArray = [
//     {
//       viewportId: axialViewportId,
//       type: ViewportType.VOLUME_3D,
//       element: element1,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.CORONAL,
//         background: [255, 255, 255],
//       },
//     },
//     {
//       viewportId: sagittalViewportId,
//       type: ViewportType.VOLUME_3D,
//       element: element2,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.SAGITTAL,
//         background: [255, 255, 255],
//       },
//     },
//   ];

//   renderingEngine.setViewports(viewportInputArray);

//   toolGroup.addViewport(axialViewportId, renderingEngineId);
//   toolGroup.addViewport(sagittalViewportId, renderingEngineId);

//   // Create a file input element
//   const fileInput = document.createElement('input');
//   fileInput.type = 'file';
//   fileInput.multiple = true;
//   fileInput.accept = '.dcm'; // Set to accept only DICOM files

//   // Handle file selection
//   fileInput.addEventListener('change', async (event) => {
//     const files = (event.target as HTMLInputElement).files;
//     if (files && files.length > 0) {
//       const imageIds = [];
//       for (const file of files) {
//         const imageId = `dicom:${file.name}`;
//         imageIds.push(imageId);
//       }
//       console.log(imageIds);

//       const volume = await volumeLoader.createAndCacheVolume(volumeId, {
//         imageIds,
//         loader: dicomImageLoader,
//       });

//       renderingEngine.addVolume(volume);

//       setVolumesForViewports(
//         renderingEngine,
//         [volume],
//         [axialViewportId, sagittalViewportId]
//       ).then(() => {
//         const axialVolumeActor = renderingEngine
//           .getViewport(axialViewportId)
//           .getDefaultActor().actor as Types.VolumeActor;

//         const sagittalVolumeActor = renderingEngine
//           .getViewport(sagittalViewportId)
//           .getDefaultActor().actor as Types.VolumeActor;

//         utilities.applyPreset(
//           axialVolumeActor,
//           CONSTANTS.VIEWPORT_PRESETS.find((preset) => preset.name === 'CT-Bone')
//         );

//         utilities.applyPreset(
//           sagittalVolumeActor,
//           CONSTANTS.VIEWPORT_PRESETS.find((preset) => preset.name === 'CT-Bone')
//         );

//         renderingEngine.render();
//       });
//     }
//   });

//   content.appendChild(fileInput);

//   const axialViewport = renderingEngine.getViewport(axialViewportId);
//   const sagittalViewport = renderingEngine.getViewport(sagittalViewportId);

//   renderingEngine.render();
// }

// run();

// /**
//  * WARNING
//  * DO NOT REMOVE ANY OF THE BELOW IMPORT STATEMENTS
//  * SOME ARE USED FOR SOME OF THE TUTORIALS, AND WILL BREAK IF REMOVED
//  */

// import {
//   RenderingEngine,
//   Types,
//   Enums,
//   setVolumesForViewports,
//   volumeLoader,
// } from '@cornerstonejs/core';
// import {
//   addTool,
//   BrushTool,
//   SegmentationDisplayTool,
//   BidirectionalTool,
//   ToolGroupManager,
//   WindowLevelTool,
//   ZoomTool,
//   segmentation,
//   Enums as csToolsEnums,
// } from '@cornerstonejs/tools';
// import {
//   initDemo,
//   createImageIdsAndCacheMetaData,
//   setTitleAndDescription,
// } from '../../../../utils/demo/helpers';

// // This is for debugging purposes
// console.warn(
//   'Click on index.ts to open source code for this example --------->'
// );

// // ============================= //
// // ======== Set up page ======== //
// setTitleAndDescription(
//   'Tutorial Playground',
//   'The playground for you to copy paste the codes in the tutorials and run it'
// );

// const { ViewportType } = Enums;
// /**
//  * Runs the demo
//  */
// async function run() {
//   // Init Cornerstone and related libraries
//   await initDemo();

//   /**
//    *
//    *
//    *
//    *
//    *
//    *
//    *
//    *
//    * Copy-paste the code from tutorials below to try them locally.
//    * You can run the tutorial after by running `yarn run example tutorial` when
//    * you are at the root of the tools package directory. HAYDEX Success!!
//    *
//    *
//    *
//    *
//    *
//    *
//    *
//    */
// }

// run();

// Load public DICOM Files and 3D Render them
// import {
//   CONSTANTS,
//   Enums,
//   getRenderingEngine,
//   RenderingEngine,
//   setVolumesForViewports,
//   Types,
//   utilities,
//   volumeLoader,
// } from '@cornerstonejs/core';
// import * as cornerstoneTools from '@cornerstonejs/tools';
// import {
//   addButtonToToolbar,
//   addDropdownToToolbar,
//   createImageIdsAndCacheMetaData,
//   initDemo,
//   setTitleAndDescription,
// } from '../../../../utils/demo/helpers';

// console.warn(
//   'Click on index.ts to open source code for this example --------->'
// );

// const {
//   ToolGroupManager,
//   TrackballRotateTool,
//   Enums: csToolsEnums,
// } = cornerstoneTools;

// const { ViewportType } = Enums;
// const { MouseBindings } = csToolsEnums;

// let renderingEngine;
// const volumeName = 'CT_VOLUME_ID';
// const volumeLoaderScheme = 'cornerstoneStreamingImageVolume';
// const volumeId = `${volumeLoaderScheme}:${volumeName}`;
// const renderingEngineId = 'myRenderingEngine';
// const axialViewportId = 'AXIAL_VIEWPORT';
// const sagittalViewportId = 'SAGITTAL_VIEWPORT';

// setTitleAndDescription(
//   'POSDA DICOM 3D Volume Rendering',
//   'Here we demonstrate how to 3D render a volume.'
// );

// const size = '500px';
// const content = document.getElementById('content');
// const viewportGrid = document.createElement('div');

// viewportGrid.style.display = 'flex';
// viewportGrid.style.display = 'flex';
// viewportGrid.style.flexDirection = 'row';

// const element1 = document.createElement('div');
// element1.oncontextmenu = () => false;
// element1.style.width = size;
// element1.style.height = size;

// const element2 = document.createElement('div');
// element2.oncontextmenu = () => false;
// element2.style.width = size;
// element2.style.height = size;

// viewportGrid.appendChild(element1);
// viewportGrid.appendChild(element2);

// content.appendChild(viewportGrid);

// const instructions = document.createElement('p');
// instructions.innerText = 'Click the image to rotate it.';

// content.append(instructions);

// addButtonToToolbar({
//   title: 'Apply random rotation',
//   onClick: () => {
//     const renderingEngine = getRenderingEngine(renderingEngineId);
//     const viewport = <Types.IVolumeViewport>(
//       renderingEngine.getViewport(axialViewportId)
//     );
//     viewport.setProperties({ rotation: Math.random() * 360 });
//     viewport.render();
//   },
// });

// addDropdownToToolbar({
//   options: {
//     values: CONSTANTS.VIEWPORT_PRESETS.map((preset) => preset.name),
//     defaultValue: 'CT-Bone',
//   },
//   onSelectedValueChange: (presetName) => {
//     const axialVolumeActor = renderingEngine
//       .getViewport(axialViewportId)
//       .getDefaultActor().actor as Types.VolumeActor;
//     utilities.applyPreset(
//       axialVolumeActor,
//       CONSTANTS.VIEWPORT_PRESETS.find((preset) => preset.name === presetName)
//     );
//     renderingEngine.render();
//   },
// });

// async function run() {
//   await initDemo();

//   const toolGroupId = 'TOOL_GROUP_ID';

//   cornerstoneTools.addTool(TrackballRotateTool);

//   const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

//   toolGroup.addTool(TrackballRotateTool.toolName, {
//     configuration: { volumeId },
//   });

//   toolGroup.setToolActive(TrackballRotateTool.toolName, {
//     bindings: [
//       {
//         mouseButton: MouseBindings.Primary,
//       },
//     ],
//   });

//   const imageIds = await createImageIdsAndCacheMetaData({
//     StudyInstanceUID:
//       '1.3.6.1.4.1.14519.5.2.1.7009.2403.871108593056125491804754960339',
//     SeriesInstanceUID:
//       '1.3.6.1.4.1.14519.5.2.1.7009.2403.367700692008930469189923116409',
//     wadoRsRoot: 'https://domvja9iplmyu.cloudfront.net/dicomweb',
//   });

//   console.log(imageIds);

//   renderingEngine = new RenderingEngine(renderingEngineId);

//   const viewportInputArray = [
//     {
//       viewportId: axialViewportId,
//       type: ViewportType.VOLUME_3D,
//       element: element1,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.CORONAL,
//         background: [255, 255, 255],
//       },
//     },
//     {
//       viewportId: sagittalViewportId,
//       type: ViewportType.VOLUME_3D,
//       element: element2,
//       defaultOptions: {
//         orientation: Enums.OrientationAxis.SAGITTAL,
//         background: [255, 255, 255],
//       },
//     },
//   ];

//   renderingEngine.setViewports(viewportInputArray);

//   toolGroup.addViewport(axialViewportId, renderingEngineId);
//   toolGroup.addViewport(sagittalViewportId, renderingEngineId);

//   const volume = await volumeLoader.createAndCacheVolume(volumeId, {
//     imageIds,
//   });

//   volume.load();

//   setVolumesForViewports(
//     renderingEngine,
//     [{ volumeId }],
//     [axialViewportId, sagittalViewportId]
//   ).then(() => {
//     const axialVolumeActor = renderingEngine
//       .getViewport(axialViewportId)
//       .getDefaultActor().actor as Types.VolumeActor;

//     const sagittalVolumeActor = renderingEngine
//       .getViewport(sagittalViewportId)
//       .getDefaultActor().actor as Types.VolumeActor;

//     utilities.applyPreset(
//       axialVolumeActor,
//       CONSTANTS.VIEWPORT_PRESETS.find((preset) => preset.name === 'CT-Bone')
//     );

//     utilities.applyPreset(
//       sagittalVolumeActor,
//       CONSTANTS.VIEWPORT_PRESETS.find((preset) => preset.name === 'CT-Bone')
//     );

//     renderingEngine.render();
//   });

//   const axialViewport = renderingEngine.getViewport(axialViewportId);
//   const sagittalViewport = renderingEngine.getViewport(sagittalViewportId);

//   renderingEngine.render();
// }

// run();
