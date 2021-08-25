// ==UserScript==
// @name         KomootHighlightsAsGpxExporter
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Save Komoot Tour Highlights as GPX-File
// @author       Frank
// @match        https://*.komoot.de/tour/*
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @grant        GM_addStyle
// @run-at       document-idle
// // @run-at context-menu

// ==UserScript==


// Some useful docs
// https://jsfiddle.net/
// https://www.tampermonkey.net/documentation.php
// https://developer.mozilla.org/en-US/docs/Web/API
// https://python.plainenglish.io/get-komoot-tour-data-without-api-143df64e51fa
// https://www.torsten-traenkner.de/javascript/greasemonkey/heise.php
// https://api.jqueryui.com/dialog/
// https://de.wikipedia.org/wiki/GPS_Exchange_Format
// https://en.wikipedia.org/wiki/GPS_Exchange_Format
// https://stackoverflow.com/questions/34101871/save-data-using-greasemonkey-tampermonkey-for-later-retrieval
// https://github.com/andreasbrett/komoot-unlocked-regions/blob/master/render_unlocked_komoot_regions.user.js
// https://gist.github.com/zhangolve/dece7434bcc48ecd615df319a3b3438e
// https://stackoverflow.com/questions/6392103/storing-into-file-using-javascript-greasemonkey


'use strict';

const VERSION = "0.1";


var fileName = "gpx.gpx";
var showDebug = false;
var $ = window.$; // just to prevent warnings about "$ not defined" in tampermonkey editor

/* CSS */
GM_addStyle(`
table {
  border-collapse: collapse;
  width: 800px;
}
td, th {
  border: 1px dashed #000;
  padding: 0.5rem;
  text-align: left;
}
#menu-add {
  padding: 0 0 5px 0;
  background: #eee;
}
#menu-add .ui-button {
  padding: 2px !important;
  font-size: 0.75em !important;
}
#menu-add button {
  color: #f00;
}
`);


/* jquery CSS */
$("head").append (
    '<link '
  + 'href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css" '
  + 'rel="stylesheet" type="text/css">'
);

function getGpxHeader() {
    var ret= `<?xml version="1.0" encoding="utf-8"?><gpx creator="Garmin Desktop App" version="1.1" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/WaypointExtension/v1 http://www8.garmin.com/xmlschemas/WaypointExtensionv1.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www8.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/ActivityExtension/v1 http://www8.garmin.com/xmlschemas/ActivityExtensionv1.xsd http://www.garmin.com/xmlschemas/AdventuresExtensions/v1 http://www8.garmin.com/xmlschemas/AdventuresExtensionv1.xsd http://www.garmin.com/xmlschemas/PressureExtension/v1 http://www.garmin.com/xmlschemas/PressureExtensionv1.xsd http://www.garmin.com/xmlschemas/TripExtensions/v1 http://www.garmin.com/xmlschemas/TripExtensionsv1.xsd http://www.garmin.com/xmlschemas/TripMetaDataExtensions/v1 http://www.garmin.com/xmlschemas/TripMetaDataExtensionsv1.xsd http://www.garmin.com/xmlschemas/ViaPointTransportationModeExtensions/v1 http://www.garmin.com/xmlschemas/ViaPointTransportationModeExtensionsv1.xsd http://www.garmin.com/xmlschemas/CreationTimeExtension/v1 http://www.garmin.com/xmlschemas/CreationTimeExtensionsv1.xsd http://www.garmin.com/xmlschemas/AccelerationExtension/v1 http://www.garmin.com/xmlschemas/AccelerationExtensionv1.xsd http://www.garmin.com/xmlschemas/PowerExtension/v1 http://www.garmin.com/xmlschemas/PowerExtensionv1.xsd http://www.garmin.com/xmlschemas/VideoExtension/v1 http://www.garmin.com/xmlschemas/VideoExtensionv1.xsd" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:wptx1="http://www.garmin.com/xmlschemas/WaypointExtension/v1" xmlns:gpxtrx="http://www.garmin.com/xmlschemas/GpxExtensions/v3" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3" xmlns:trp="http://www.garmin.com/xmlschemas/TripExtensions/v1" xmlns:adv="http://www.garmin.com/xmlschemas/AdventuresExtensions/v1" xmlns:prs="http://www.garmin.com/xmlschemas/PressureExtension/v1" xmlns:tmd="http://www.garmin.com/xmlschemas/TripMetaDataExtensions/v1" xmlns:vptm="http://www.garmin.com/xmlschemas/ViaPointTransportationModeExtensions/v1" xmlns:ctx="http://www.garmin.com/xmlschemas/CreationTimeExtension/v1" xmlns:gpxacc="http://www.garmin.com/xmlschemas/AccelerationExtension/v1" xmlns:gpxpx="http://www.garmin.com/xmlschemas/PowerExtension/v1" xmlns:vidx1="http://www.garmin.com/xmlschemas/VideoExtension/v1">`;
    ret += `
<metadata>
  <link href="https://dl4xj.com">
     <text>tapermonkey, KomootHighlightsAsGpxExporter, `;
    ret+= VERSION;
    ret+=`</text>
  </link>
  <time>2021-08-22T00:00:00Z</time>
</metadata>
`;
    return ret;
}

function getGpxFooter() {
    var ret = `</gpx>`;
    return ret;
}

function getGpxWaypoint(name, lat, lng, alt, desc) {
    var ret;
    ret = '<wpt lat="' + lat + '" lon="' + lng + '">\n';
    ret+= '  <ele>' + alt + '</ele>\n';
    ret+= '  <name>' + name + '</name>\n';
    ret+= '  <desc>' + desc + '</desc>\n';
    ret+= '  <sym>Flag, Blue</sym>\n';
    ret+= '</wpt>\n';
    return ret;
}

var saveData = (function () {
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    return function (data, fileName) {
        var blob = new Blob([data], {type: "text/plain"});
        var url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
    };
}());

function clickButtonDbg(ev) {
    showDebug = !showDebug;
    $("#dialog").dialog(showDebug ? 'open' : 'close');
}

function clickButtonGpx(ev) {
    saveData(gpxText, fileName);
}

function sanitizeFileName(name) {
    return name.replace(/ /g, "_").replace(/[^\p{L}\p{N}^$\n]/gu, '');
}

function sanitizeText(text) {
    /*
      Removes all symbols except:
       \p{L} - all letters from any language
       \p{N} - numbers
       \p{P} - punctuation
       \p{Z} - whitespace separators
       ^$\n  - add any symbols you want to keep
    */
    return text.replace(/[^\p{L}\p{N}\p{P}\p{Z}^$\n]/gu, '').replace(/&/g, '');;
}

/* Action ... */
const kmtProps = unsafeWindow.kmtBoot.getProps();
const tour = kmtProps.page._embedded.tour;
var text, gpxText;
text = '<div id="dialog" title="Highlights to GPX">';
gpxText = getGpxHeader();
if (tour._embedded.way_points._embedded.items.length > 0) {
    fileName = 'komoot-tour-gpx-wpt-export-' + sanitizeFileName(tour.name) + '.gpx';
    text+= '  <b>Tour #' + tour.id + ', ' + tour.name + '</b>';
    text+= '  <table>';
    text+= '<tr><th>#</th><th>Type</th><th>Name</th><th>Up</th><th>Down</th><th>Info</th><th>Lattitude</th><th>Longitude</th><th>Altitude</th><tr>';
    for (var i = 0, cnt = 0; i < tour._embedded.way_points._embedded.items.length; i++) {
        if (tour._embedded.way_points._embedded.items[i].type == "highlight") {
            cnt++;
            const highlight = tour._embedded.way_points._embedded.items[i]._embedded.reference;
            console.log("i=" + i);
            text+= '<tr>';
            text+= '<td>' + cnt + '</td>';
            text+= '<td>' + highlight.type.replace('highlight_','') + '</td>';
            text+= '<td>' + highlight.name + '</td>';
            var desc = "";
            try {
                const tips = highlight._embedded.tips._embedded;
                if (tips.items.length > 0) {
                    text+= '<td>' + tips.items[0].rating.up + '</td>';
                    text+= '<td>' + tips.items[0].rating.down + '</td>';
                    text+= '<td>' + tips.items[0].text + '</td>';
                    //desc = sanitizeText(tips.items[0].text);
                    desc = tips.items[0].text;
                }
            }
            catch {
                text+= '<td>%</td>';
                text+= '<td>%</td>';
                text+= '<td>%</td>';
            }
            text+= '<td>' + highlight.location.lat + '</td>';
            text+= '<td>' + highlight.location.lng + '</td>';
            text+= '<td>' + highlight.location.alt + '</td>';

            text+= '</tr>';
            gpxText += getGpxWaypoint(sanitizeText(highlight.name), highlight.location.lat, highlight.location.lng, highlight.location.alt, desc);
        }
    }
    text+= '  </table>';
} else {
    text+= '<p>Hmmm, a tour without any point or highlight!?</p>';
}
text+= '</div>';
gpxText+= getGpxFooter();

$("body").append(text);
$("#dialog").dialog({ autoOpen: false, maxHeight: 640, width: 1024, maxWidth: 1024, close: function() { showDebug = false; } });


// quick and dirty adding a menu to the top ...
var countDown = 20; /* Retry for 20 * 1000ms */
function addMenu() {
    var gpxButton = document.querySelector("#gpx-button");
    if (!gpxButton) {
        var pos = document.querySelector("#pageMountNode > div > div:nth-child(3) > div.tw-bg-beige-light.lg\\:tw-bg-white.u-bg-desk-column > div.css-0 > div > div > div > div.tw-w-full.lg\\:tw-w-2\\/5 > div > div > div > div:nth-child(1)");
        if (!pos) {
            pos = document.querySelector("body"); // fallback position at first element of body ...
        }
        var add = document.createElement('div');
        add.innerHTML = `
  <h2>Tampermonkey: Save highlights as GPX</h2>
  <button class="ui-button ui-widget ui-corner-all" id="gpx-button" >Save as GPX ...</button>&nbsp;
  <button class="ui-button ui-widget ui-corner-all" id="csv-button" >Save as CSV ...</button>&nbsp;
  <button class="ui-button ui-widget ui-corner-all" id="dbg-button" >DEBUG ...</button>&nbsp;
`;
        // add.style.cssText += "padding: 0 0 5px 0;";
        add.setAttribute('id', 'menu-add');
        pos.prepend(add); // todo ...
        $("#dbg-button").click(clickButtonDbg);
        $("#gpx-button").click(clickButtonGpx);
    }

    countDown--;
    if (countDown > 0) {
        setTimeout(addMenu, 1000);
    }
}

setTimeout(addMenu, 1000);

// ==/UserScript==