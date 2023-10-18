import { RenderingEngine, Types, Enums } from '@cornerstonejs/core';
import {
  addButtonToToolbar,
  addDropdownToToolbar,
  initDemo,
  setTitleAndDescription,
} from '../../../../utils/demo/helpers';
import * as cornerstoneTools from '@cornerstonejs/tools';

// This is for debugging purposes
console.warn(
  'Click on index.ts to open source code for this example --------->'
);

const {
  PanTool,
  ZoomTool,
  VideoRedactionTool,
  StackScrollMouseWheelTool,
  ToolGroupManager,
  Enums: csToolsEnums,
} = cornerstoneTools;

const { ViewportType } = Enums;
const { MouseBindings } = csToolsEnums;

const toolGroupId = 'VIDEO_TOOL_GROUP_ID';

// ======== Set up page ======== //
setTitleAndDescription(
  'Basic Video Tools',
  'Show a video viewport with controls to allow it to be navigated and zoom/panned'
);

const content = document.getElementById('content');
const element = document.createElement('div');

// Disable right click context menu so we can have right click tools
element.oncontextmenu = (e) => e.preventDefault();

element.id = 'cornerstone-element';
element.style.width = '500px';
element.style.height = '500px';

content.appendChild(element);

const rangeDiv = document.createElement('div');
rangeDiv.innerHTML =
  '<div id="time" style="float:left;width:2.5em;">0 s</div><input id="range" style="width:400px;height:8px;float: left" value="0" type="range" /><div id="remaining">unknown</div>';
content.appendChild(rangeDiv);
const rangeElement = document.getElementById('range');
rangeElement.onchange = (v) => {
  viewport.setTime(Number(rangeElement.value));
};

const instructions = document.createElement('p');
instructions.innerText =
  'Left Click: Video Redaction\nMiddle Click: Pan\nRight Click: Zoom\n Mouse Wheel: Stack Scroll';

content.append(instructions);
// ============================= //

const renderingEngineId = 'myRenderingEngine';
const viewportId = 'videoViewportId';
let viewport;

addButtonToToolbar({
  id: 'play',
  title: 'Play',
  onClick() {
    viewport.togglePlayPause();
  },
});

addButtonToToolbar({
  id: 'next',
  title: 'next',
  onClick() {
    viewport.scroll(1);
  },
});
addButtonToToolbar({
  id: 'previous',
  title: 'previous',
  onClick() {
    viewport.scroll(-1);
  },
});
addButtonToToolbar({
  id: 'jump',
  title: 'jump to 50',
  onClick() {
    viewport.setTime(50);
  },
});

const playbackSpeeds = [
  '0',
  '0.075',
  '0.15',
  '0.25',
  '0.5',
  '0.75',
  '1',
  '2',
  '3',
  '4',
  '10',
];

addDropdownToToolbar({
  options: { values: playbackSpeeds, defaultValue: '1' },
  onSelectedValueChange: (newSelectedToolNameAsStringOrNumber) => {
    const newPlaybackSpeed = Number(newSelectedToolNameAsStringOrNumber);
    viewport.setPlaybackRate(newPlaybackSpeed);
  },
});

const scrollSpeeds = ['1 f', '2 f', '4 f', '0.5 s', '1 s', '2 s', '4 s'];

addDropdownToToolbar({
  options: { values: scrollSpeeds, defaultValue: '1 f' },
  onSelectedValueChange: (value) => {
    const unit = value[value.length - 1];
    const newScrollSpeed = Number(value.substring(0, value.length - 2));
    viewport.setScrollSpeed(newScrollSpeed, unit);
  },
});

/**
 * Runs the demo
 */
async function run() {
  // Init Cornerstone and related libraries
  await initDemo();

  // Add tools to Cornerstone3D
  cornerstoneTools.addTool(PanTool);
  cornerstoneTools.addTool(VideoRedactionTool);
  cornerstoneTools.addTool(ZoomTool);
  cornerstoneTools.addTool(StackScrollMouseWheelTool);

  // Define a tool group, which defines how mouse events map to tool commands for
  // Any viewport using the group
  const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);

  // Add tools to the tool group
  toolGroup.addTool(PanTool.toolName);
  toolGroup.addTool(ZoomTool.toolName);
  toolGroup.addTool(VideoRedactionTool.toolName);
  toolGroup.addTool(StackScrollMouseWheelTool.toolName);

  toolGroup.setToolActive(VideoRedactionTool.toolName, {
    bindings: [
      {
        mouseButton: MouseBindings.Primary, // Left Click
      },
    ],
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
  toolGroup.setToolActive(StackScrollMouseWheelTool.toolName);

  // Get Cornerstone imageIds and fetch metadata into RAM

  // Instantiate a rendering engine
  const renderingEngine = new RenderingEngine(renderingEngineId);

  // Create a stack viewport

  const viewportInput = {
    viewportId,
    type: ViewportType.VIDEO,
    element,
    defaultOptions: {
      background: <Types.Point3>[0.2, 0, 0.2],
    },
  };

  renderingEngine.enableElement(viewportInput);

  // Get the stack viewport that was created
  viewport = <Types.IStackViewport>renderingEngine.getViewport(viewportId);

  toolGroup.addViewport(viewport.id, renderingEngineId);

  // Set the stack on the viewport
  await viewport.setVideo('http://localhost:3000/rendered.mp4');

  // Set the VOI of the stack
  // viewport.setProperties({ voiRange: ctVoiRange });

  // Render the image
  viewport.play();

  const seconds = (time) => `${Math.round(time * 10) / 10} s`;

  element.addEventListener(Enums.Events.IMAGE_RENDERED, (evt) => {
    const { time, duration } = evt.detail;
    rangeElement.value = time;
    rangeElement.max = duration;
    const timeElement = document.getElementById('time');
    timeElement.innerText = seconds(time);
    const remainingElement = document.getElementById('remaining');
    remainingElement.innerText = seconds(duration - time);
  });
}

run();