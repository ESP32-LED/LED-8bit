let jsonData = null;

let typeId = null;
let destinationId = null;
let nextId = null;
let informationId = null;
let information2Id = null;
let lineId = null;
let carNumberId = null;
let scrollId = null;

let displayMode = "normal";
let informationMode = "destination";
let typeMode = null;
let lang = "ja";
let showNext = false;
let scene = 0;
let sceneList = [];
let typeScene = 0;
let typeSceneList = [];
let frame = 0;

let ledsize = 6;
let ledgap = 1;
let pitch = ledsize + ledgap;
let radius = ledsize / 2;
let sizeLed = document.getElementById("led");

let currentMatrix = null;

let langIndex = 0;

let scrollX = 128;
let scrollTextMatrix = [];
let scrollTimer = null;

let scrollMatrix = null;

let clickStartScrollBtn = false;

let scrollGeneration = 0;

let scrollWaiting = false;

let areaLeft = 48;
let areaRight = 128;
let areaTop = 16;
let areaBottom = 32;

let scrollSpeed = 450;

let typeScroll = false;
let destinationScroll = false;

let clickTypeBtn = false;

const langs = ["ja", "en"];
