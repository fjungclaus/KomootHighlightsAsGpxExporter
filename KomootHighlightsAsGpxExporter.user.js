// ==UserScript==
// @name         KomootHighlightsAsGpxExporter
// @namespace    https://github.com/fjungclaus
// @version      0.9.41
// @description  Save Komoot Tour Highlights as GPX-File
// @author       Frank Jungclaus, DL4XJ
// @supportURL   https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/issues
// @downloadURL  https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/raw/refs/heads/main/KomootHighlightsAsGpxExporter.user.js
// @updateURL    https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/raw/refs/heads/main/KomootHighlightsAsGpxExporter.user.js
// @license      GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0.txt
// @match        https://*.komoot.com/*/tour/*
// @match        https://*.komoot.de/tour/*
// @exclude      https://*.komoot.de/tour/*/edit
// @exclude      https://*.komoot.com/tour/*/edit
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @grant        GM_addStyle
// @grant        GM.xmlHttpRequest
// @connect      api.komoot.de
// @connect      api.komoot.com
// @run-at       document-idle
// ==/UserScript==


// *** Some useful docs ***
//   https://jsfiddle.net/
//   https://www.tampermonkey.net/documentation.php
//   https://developer.mozilla.org/en-US/docs/Web/API
//   https://python.plainenglish.io/get-komoot-tour-data-without-api-143df64e51fa
//   https://www.torsten-traenkner.de/javascript/greasemonkey/heise.php
//   https://api.jqueryui.com/dialog/
//   https://de.wikipedia.org/wiki/GPS_Exchange_Format
//   https://en.wikipedia.org/wiki/GPS_Exchange_Format
//   https://stackoverflow.com/questions/34101871/save-data-using-greasemonkey-tampermonkey-for-later-retrieval
//   https://github.com/andreasbrett/komoot-unlocked-regions/blob/master/render_unlocked_komoot_regions.user.js
//   https://gist.github.com/zhangolve/dece7434bcc48ecd615df319a3b3438e
//   https://stackoverflow.com/questions/6392103/storing-into-file-using-javascript-greasemonkey


'use strict';


var showDebug = false;
var retry = 0; /* Retries to insert our menu */
var $ = window.$; // just to prevent warnings about "$ not defined" in tampermonkey editor
var dbgText = "", gpxWptText = "", gpxTrkText = "", csvText = "";
var fileName = "gpx.gpx";
var gpxx = { waypoints: [], coordDists: [], meta: { nrHighlights: {is: 0, should: 0}, nrPOIs: {is: 0 , should: 0}, name: "-name-", id: "-id-" }};
var bgData = {nrProblems: 0, nrFetched: 0, waypoints : []}; // background data (waypoints) fetched in background on our own ...
const kmtBoot = unsafeWindow.kmtBoot;
var kmtProps = null;
var tour = null;
const S_VERSION = GM_info.script.version;
const S_NAME = GM_info.script.name;
const S_HANDLER = GM_info.scriptHandler;
const S_HANDLER_VERSION = GM_info.version;
const MAX_RETRY= 60; // max. retries to install our menu (MAX_RETRY * 250ms)
const tStart = Date.now();
var tStartBGFetch = tStart;

// CSS
GM_addStyle(`
table {
  border-collapse: collapse;
  width: 1520px;
}

th {
  position: sticky;
  top: 0;
  background: #d7edf4;
  z-index: 2;
  border: 1px dashed #000;
  padding: 0.5rem;
  text-align: center;
}

tr:nth-child(odd) {
  background-color: #ffffff;
}

tr:nth-child(even) {
  background-color: #e8e8e8;
}

td {
  border: 1px dashed #000;
  padding: 0.5rem;
  text-align: left;
}

div #menu-add {
  padding: 10px !important;
  background: #eeeeee;
  border-radius: 16px;
  margin-bottom: 15px;
  border: 3px solid #4e6e1e;
}

#menu-add .ui-button {
  padding: 6px !important;
  margin: 10px 0 2px 0 !important;
  font-size: 0.75em !important;
  font-weight: bold;
  border-radius: 8px;
  transition: background-color 0.5s;
}

#menu-add button:hover {
  background-color: #b3b3b3;
}

#menu-add button {
  color: #144696;
}

#menu-add #gpx-full-button {
  color: #4e6e1e;
  border: 2px solid;
}


.ui-front {
    z-index: 255 !important;
}

#hrefprj { color: #144696; }
#hrefprj:hover { color: #4e6e1e; }

`);


// Add jquery CSS
$("head").append (
    '<link '
  + 'href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css" '
  + 'rel="stylesheet" type="text/css">'
);


function d2r(degrees) {
    return degrees * Math.PI / 180.0;
}


// haversine algo + pythagoras to also take altitude into consideration ...
function haversineDist3D(p1, p2) {
    const R = 6371000; // in meters to match alt, which is also in meters
    const lat1 = d2r(p1.lat);
    const lon1 = d2r(p1.lng);
    const lat2 = d2r(p2.lat);
    const lon2 = d2r(p2.lng);
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dst = R * c;
    const dAlt = (p2.alt) - (p1.alt); // assume alt in meters ...

    return Math.sqrt(dst ** 2 + dAlt ** 2) / 1000.0; // return in km
}


function getDistsAlongTrack(coords, coordDistances) {
    let total = 0;

    coordDistances[0] = 0;
    for (let i = 1; i < coords.length; i++) {
        total += haversineDist3D(coords[i - 1], coords[i]);
        coordDistances.push(total.toFixed(1));
    }
}


function getGpxHeader(name) {
    var ret;
    ret = `<?xml version='1.0' encoding='UTF-8'?>
<gpx version="1.1" creator="https://www.komoot.de" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>`;
    ret+= name;
    ret+= `</name>
    <author>
      <link href="`;
    ret+= document.URL.match(/https:\/\/.*komoot.*\/[0-9]+/);
    ret += `">
        <text>Tampermonkey, https://dl4xj.de, KomootHighlightsAsGpxExporter, V`;
    ret+= S_VERSION;
    ret+=`</text>
        <type>text/html</type>
      </link>
    </author>
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
    ret = ' <wpt lat="' + lat + '" lon="' + lng + '">\n';
    ret+= '   <ele>' + alt + '</ele>\n';
    ret+= '   <name>' + name + '</name>\n';
    ret+= '   <desc>' + desc + '</desc>\n';
    ret+= '   <sym>Flag, Blue</sym>\n';
    ret+= ' </wpt>\n';
    return ret;
}


function getGpxTrkpointHeader(name) {
    var ret;
    ret = ' <trk>\n';
    ret+= '  <name>' + name + '</name>\n';
    ret+= '  <trkseg>\n';
    return ret;
}


function getGpxTrkpointFooter() {
    var ret;
    ret = '  </trkseg>\n';
    ret+= ' </trk>\n';
    return ret;
}


function getGpxTrkpoint(coord) {
    var ret;
    var t= new Date(tour.date);
    t.setSeconds(t.getSeconds() + coord.t / 1000); // coord.t is in milli seconds!
    ret = '   <trkpt lat="' + coord.lat + '" lon="' + coord.lng + '">\n';
    ret+= '     <ele>' + coord.alt + '</ele>\n';
    ret+= '     <time>' + t.toISOString() + '</time>\n';
    ret+= '   </trkpt>\n';
    return ret;
}


// Save given data to given filename
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


function clickButtonCSV(ev) {
    collectWaypoints();
    createCSVText();
    saveData(csvText, fileName + ".csv"); // xxx.gpx.csv by intention!
}


function clickButtonDbg(ev) {
    collectWaypoints();
    createDebugText();
    $("body").append(dbgText);
    $("#dialog").dialog({ autoOpen: false, maxHeight: 800, width: 1580, maxWidth: 1600, close: function() { showDebug = false; } });
    showDebug = !showDebug;
    $("#dialog").dialog(showDebug ? 'open' : 'close');
}


function clickButtonGpx(ev) {
    var txt;
    collectWaypoints();
    createGpxWptText();
    txt = getGpxHeader("Tour=" + gpxx.meta.id + ", " + sanitizeText(gpxx.meta.name));
    txt+= gpxWptText;

    if (ev.currentTarget.id == "gpx-full-button") {
        createGpxTrkText();
        txt+= getGpxTrkpointHeader(sanitizeText(gpxx.meta.name));
        txt+= gpxTrkText;
        txt+= getGpxTrkpointFooter();
    }

    txt+= getGpxFooter();
    saveData(txt, fileName);

}


function sanitizeFileName(name) {
    /*
      Removes all symbols except:
       \p{L} - all letters from any language
       \p{N} - numbers
       \p{P} - punctuation
       \p{Z} - whitespace separators
       ^$\n  - add any symbols you want to keep

       .replace(/[^\p{L}\p{N}\p{P}\p{Z}^$\n]/gu, '').replace(/&/g, '');
    */
    return name.replace(/ /g, "_").replace(/[^\p{L}\p{N}^$\n]/gu, '');
}


// make it safe for xml / html
function sanitizeText(txt) {
    return txt.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
}


function htmlColorize(txt, color) {
    return '<font color="' + color + '">' + txt + '</font>';
}


// A jQuery dialog with some debug data
function createDebugText() {
    if (dbgText == "") {
        dbgText = '<div id="dialog" title="Highlights to GPX">';
        dbgText+= '<b>';
        dbgText+= 'Tour Id=' + gpxx.meta.id + ', Name=' + sanitizeText(gpxx.meta.name);
        dbgText+= ', Highlights=<font color="' + ((gpxx.meta.nrHighlights.is == gpxx.meta.nrHighlights.should) ? 'green' : 'red') + '">' + gpxx.meta.nrHighlights.is + '/' + gpxx.meta.nrHighlights.should + '</font>';
        dbgText+= ', POIs=<font color="' + ((gpxx.meta.nrPOIs.is == gpxx.meta.nrPOIs.should) ? 'green' : 'red') + '">' + gpxx.meta.nrPOIs.is + '/' + gpxx.meta.nrPOIs.should + '</font>';
        dbgText+= ', GPX track points=' + tour._embedded.coordinates.items.length;
        dbgText+= '</b>';
        if (gpxx.waypoints.length > 0) {
            dbgText+= '<table>';
            dbgText+= '<tr><th>#</th><th title="*** Flags\nB:background fetch\nD:deprecated data?">&#x1F6A9;</th><th>Type</th><th>Name</th><th>Info</th><th title="Latitude [°]">Lat</th><th title="longitude [°]">Lon</th><th title="Altitude [m]">Alt</th><th title="Distance along track [km]">Dist</th><tr>';
            for (var i = 0; i < gpxx.waypoints.length; i++) {
                const wp = gpxx.waypoints[i];
                const color = wp.flags.includes('D') ? "red" : wp.flags.includes('B') ? "orange" : "black";

                dbgText+= '<tr>';
                dbgText+= '<td>' + (i + 1) + '</td>';
                dbgText+= '<td>' + wp.flags + '</td>';
                dbgText+= '<td>' + wp.type + '</td>';
                dbgText+= '<td>' + htmlColorize(sanitizeText(wp.name), color) + '</td>';
                dbgText+= '<td>' + htmlColorize(sanitizeText(wp.info).replaceAll("\n" , "<br>"), color) + '</td>';
                dbgText+= '<td>' + wp.lat + '</td>';
                dbgText+= '<td>' + wp.lng + '</td>';
                dbgText+= '<td>' + wp.alt + '</td>';
                dbgText+= '<td>' + wp.dist + '</td>';
                dbgText+= '</tr>';
            }
            dbgText+= '</table>';
        } else {
            dbgText+= '<p>Hmmm, a tour without any point or highlight!?</p>';
        }
        dbgText+= '</div>';
    }
}


function addCSVElement(ele, first, last) {
    let csva = "";

    if (!first) {
        csva+= ',';
    }
    csva+= '"';
    csva+= ele.toString().replaceAll('"', '""');
    csva+= '"';
    if (last) {
        csva+= '\n';
    }

    return csva;
}


function createCSVText() {
    if (csvText == "") {
        csvText+= addCSVElement("Tour Id", 1, 0);
        csvText+= addCSVElement(gpxx.meta.id, 0, 0);
        csvText+= addCSVElement("Name", 0, 0);
        csvText+= addCSVElement(gpxx.meta.name, 0, 1);

        if (gpxx.waypoints.length > 0) {
            csvText+= '"#","Flags","Type","Name","Latitude","Longitude","Altitude","Distance","Info"\n';
            for (var i = 0; i < gpxx.waypoints.length; i++) {
                const wp = gpxx.waypoints[i];
                csvText+= addCSVElement(i+1, 1, 0);
                csvText+= addCSVElement(wp.flags, 0, 0);
                csvText+= addCSVElement(wp.type, 0, 0);
                csvText+= addCSVElement(wp.name, 0, 0);
                csvText+= addCSVElement(wp.lat, 0, 0);
                csvText+= addCSVElement(wp.lng, 0, 0);
                csvText+= addCSVElement(wp.alt, 0, 0);
                csvText+= addCSVElement(wp.dist, 0, 0);
                csvText+= addCSVElement(wp.info, 0, 1);

            }
        }
    }
}


function gmRequest(details) {
    return new Promise((resolve, reject) => {
        GM.xmlHttpRequest({
            ...details,
            onload: resolve,
            onerror: reject,
            ontimeout: reject
        });
    });
}


// !!! Be careful, debugging might interfere the background fetch !!!
async function fetchData(wp) {
    try {
        const response = await gmRequest({
            method: "GET",
            url: wp.href
        });

        console.log("*** fetch: url=" + wp.href + ", state=" + response.status + ":" + response.response);

        wp.state = response.status;
        // return response.response;
        if (response.status == 200) {
            wp.data = JSON.parse(response.response)
            bgData.nrFetched++;
        } else {
            wp.data = { };
        }

        updateFetchState();

    } catch (error) {
        console.error("Requesting " + wp.href + " failed", error);
        wp.data = { };
        wp.state = "666";
    }
}


function updateFetchState() {
    var color;

    if (bgData.nrProblems == 0) {
        color = "black";
        showButtons(1);
    } else if (bgData.nrFetched < bgData.nrProblems) {
        color = "red";
    } else {
        color = "green";
        showButtons(1);
    }

    var d = document.getElementById("bgFetch");
    if (d) {
        d.innerHTML = '<font color="' + color + '">' + bgData.nrFetched + " of " + bgData.nrProblems + '</font> (' + (Date.now() - tStartBGFetch) + 'ms)';
    }
    d = document.getElementById("nrPOIs");
    if (d) {
        d.innerHTML = gpxx.meta.nrPOIs.should;
    }
    d = document.getElementById("nrHighlights");
    if (d) {
        d.innerHTML = gpxx.meta.nrHighlights.should;
    }
}


// Check for waypoints without a name, then try to fetch data for those in background ...
function checkWaypoints() {
    bgData.nrProblems = 0;
    gpxx.meta.nrHighlights.should = 0;
    gpxx.meta.nrPOIs.should = 0;
    tStartBGFetch = Date.now();
    for (var i = 0, cnt = 0; i < tour._embedded.way_points._embedded.items.length; i++) {
        let item = tour._embedded.way_points._embedded.items[i];

        if (item.attributes.type == "highlight") {
            gpxx.meta.nrHighlights.should++;
        } else if (item.attributes.type == "poi") {
            gpxx.meta.nrPOIs.should++;
        }

        if (item.attributes.type == "highlight" || item.attributes.type == "poi") {
            if (!item?._syncedAttributes?._embedded?.reference?.name) {
                cnt++;
                let mocRef = item.links.reference.href; // .replace("https://", "//");
                // let mocData = item.store.moc[mocRef];
                let id = mocRef.split('/').pop();
                console.log(cnt + ": waypoint Ref="+ mocRef + ", ID=" + id + " without a name ...");
                bgData.nrProblems++;
                bgData.waypoints.push({ id: id, wpItemIndex: i, href: mocRef, state: 0 });
                fetchData(bgData.waypoints.at(-1)); // done in background
            }
        }
    }

    updateFetchState();
}


// Gather all hightlights and POIs into a gpxx object
function collectWaypoints() {
    if (gpxx.waypoints.length == 0) {
        getDistsAlongTrack(tour._embedded.coordinates.items, gpxx.coordDists);
        gpxx.meta.id = tour.id;
        gpxx.meta.fileName = 'komoot-tour-gpx-wpt-export-' + sanitizeFileName(tour.name) + '.gpx';
        gpxx.meta.name = tour.name;
        fileName = gpxx.meta.fileName;
        if (tour._embedded.way_points._embedded.items.length > 0) {
            for (let i = 0; i < tour._embedded.way_points._embedded.items.length; i++) {
                let waypoint = { flags: "", info: "" };
                const item = tour._embedded.way_points._embedded.items[i];

                if (item.attributes.type == "highlight") {
                    let highlight;

                    // todo: add a try/catch for the whole block???

                    if (item._syncedAttributes?._embedded?.reference?.name) {
                        highlight = item._syncedAttributes._embedded.reference;
                    } else {
                        // Highlight waypoint with some data missing ...
                        // Try to use data from previous background fetch ...
                        const bgwp = bgData.waypoints.find(ele => (ele.wpItemIndex == i));
                        highlight = bgwp.data;
                        waypoint.flags += "B"; // 'B' => using background data

                        if (highlight._links?.self?.deprecation) {
                            waypoint.flags += "D"; // 'D' = deprecation
                            waypoint.info = "Deprecated data? Please to try to re-add this highlight to your tour ...";
                        }
                    }

                    waypoint.name = highlight.name;
                    waypoint.type = highlight.type.replace('highlight_','').toUpperCase();

                    if (waypoint.info == "") {
                        if (highlight?._embedded?.tips?._embedded?.items[0]?.attributes?.text) {
                            waypoint.info = highlight?._embedded?.tips?._embedded?.items[0]?.attributes?.text;
                        }
                    }


                    if (typeof highlight.start_point !== 'undefined') {
                        waypoint.lat = highlight.start_point.lat;
                        waypoint.lng = highlight.start_point.lng;
                    } else {
                        waypoint.lat = highlight.location.lat;
                        waypoint.lng = highlight.location.lng;
                    }

                    if (typeof highlight.start_point !== 'undefined') {
                        waypoint.alt = highlight.start_point.alt;
                    } else if (typeof highlight.location.alt !== 'undefined') {
                        waypoint.alt = highlight.location.alt;
                    } else {
                        waypoint.alt = item?.attributes?.index ? tour._embedded.coordinates.items[item.attributes.index].alt : "0.0000";
                    }

                    waypoint.dist = item?.attributes?.index ? gpxx.coordDists[item.attributes.index] : 0;

                    gpxx.waypoints.push(waypoint);
                    gpxx.meta.nrHighlights.is++;

                } else if (item.attributes.type == "poi") {
                    const poi = item._syncedAttributes._embedded.reference;
                    waypoint.type = "POI";
                    waypoint.name = poi.name;
                    waypoint.info = "";

                    if (poi._embedded?.details && poi._embedded?.details?.items?.length) {
                        for(var j = 0; j < poi._embedded.details.items.length; j++) {
                            waypoint.info += poi._embedded.details.items[j].key + ":" + poi._embedded.details.items[j].formatted + "; \n";
                        }
                    } else {
                        waypoint.info = "";
                    }

                    waypoint.lat = poi.location.lat;
                    waypoint.lng = poi.location.lng;
                    waypoint.alt = item?.attributes?.index ? tour._embedded.coordinates.items[item.attributes.index].alt : "0.0000";
                    waypoint.dist = item?.attributes?.index ? gpxx.coordDists[item.attributes.index] : "0.000";

                    gpxx.waypoints.push(waypoint);
                    gpxx.meta.nrPOIs.is++;

                }
            }
        }
    }
}


// Get all highlights of tour as GPX waypoints
function createGpxWptText() {
    if (gpxWptText == "") {
        for (var i = 0; i < gpxx.waypoints.length; i++) {
            const wp = gpxx.waypoints[i];
            gpxWptText += getGpxWaypoint(sanitizeText(wp.name), wp.lat, wp.lng, wp.alt, sanitizeText(wp.info));
        }
    }
}


// Get all points of the track itself
function createGpxTrkText() {
    if (tour._embedded.coordinates.items.length > 0) {
        var coord;
        for (var i = 0; i < tour._embedded.coordinates.items.length; i++) {
            coord = tour._embedded.coordinates.items[i];
            gpxTrkText+= getGpxTrkpoint(coord);
        }
    }
}


function selectorContainsText(selector, text) {
  var elements = document.querySelectorAll(selector);
  return Array.prototype.filter.call(elements, function(element){
    return RegExp(text).test(element.textContent);
  });
}


// Subnode: . vor // sonst doch das ganze Dokument!
function subEval(xpath, node)
{
    // !!! trailing '.' else full document !!!
    return document.evaluate(xpath, node, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
}


function showButtons(show) {
 if (show) {
    $("#dbg-button").show();
    $("#gpx-button").show();
    $("#csv-button").show();
    $("#gpx-full-button").show();
 } else {
    $("#dbg-button").hide();
    $("#gpx-button").hide();
    $("#csv-button").hide();
    $("#gpx-full-button").hide();
 }
}


// Quick and dirty adding a menu
function addMenu() {

    // "per copy JS path" ...
    var pos = document.querySelector("#pageMountNode > div > div:nth-child(3) > div.tw-bg-canvas.lg\\:tw-bg-card.u-bg-desk-column > div.css-1u8qly9 > div > div > div > div.tw-w-full.lg\\:tw-w-2\\/5");
    var isFallback = false;

    if (!pos && retry >= MAX_RETRY) {
        pos = document.querySelector("body"); // fallback position at first element of body ...
        isFallback = true;
    }

    console.log("addMenu: t=" + (Date.now() - tStart) + "ms, retry=" + retry + ', pos=' + pos);

    if (pos) {
        kmtProps = kmtBoot?.getProps();
        if (kmtProps?.page?._embedded?.tour) {
            tour = kmtProps.page._embedded.tour;
            console.log("standard mode tour ...");
        } else if (kmtProps?.page?._syncedAttributes?._embedded?.tour) {
            tour = kmtProps.page._syncedAttributes._embedded.tour;
            console.log("synced attributes mode tour...");
        }

        if (tour) {
            console.log("tourName=" + tour?.name);
        } else if (retry < MAX_RETRY) { // 60 * 250ms = 15s
            retry++;
            setTimeout(addMenu, 250);
            return;
        }
    } else if (retry < MAX_RETRY) { // 60 * 250ms = 15s
        retry++;
        setTimeout(addMenu, 250);
        return;
    }

    if (!pos || !tour) {
        console.log("Timeout ... No menu :(");
        document.body.style.backgroundColor= "";
        return;
    }

    var add = document.createElement('div');
    var html;
    html = '<p><small><b><a id="hrefprj" href="https://github.com/fjungclaus/KomootHighlightsAsGpxExporter">' + S_NAME + '</a>=V' + S_VERSION + '</b>, ' + S_HANDLER + '=V' + S_HANDLER_VERSION + '</small></p>';
    html += '<p><small>Highlights=<span id="nrHighlights">?</span>, POIs=<span id="nrPOIs">?</span>, Menu-try=' + retry.toString() + ' (' + (Date.now() - tStart) + 'ms)';
    html += ',<br><span title="Nr. of highlights with imcomplete data, to be fetched on our own in background http-requests ...">Background-fetch=<span id="bgFetch">0 of 0</span></span></small></p>';
    html += ' <button class="ui-button ui-widget ui-corner-all" id="dbg-button" title="Table with some debug / preview information about all highlights and POIs found ...">Preview ...</button>&nbsp';
    html += ' <button class="ui-button ui-widget ui-corner-all" id="gpx-button" title="Save highlights and POIs without the GPX track itself into a GPX file" >Save as GPX ...</button>&nbsp';
    html += ' <button class="ui-button ui-widget ui-corner-all" id="gpx-full-button" title="Save highlights and POIs plus the GPX-track in a single GPX file">Save as GPX (+track) ...</button>&nbsp';
    html += ' <button class="ui-button ui-widget ui-corner-all" id="csv-button" title="Save highlights and POIs as CSV. Not yet implemented! Please use copy&paste to e.g. Libreoffice Calc from DEBUG-table">Save as CSV ...</button>&nbsp';
    add.innerHTML = html;

    if (isFallback) {
        add.style.cssText += "padding: 75px 0 0 0;";
    } else {
        add.style.cssText += "padding: 0 0 0 25px;";
    }

    add.setAttribute('id', 'menu-add');
    pos.prepend(add);
    showButtons(0);
    $("#dbg-button").click(clickButtonDbg);
    $("#gpx-button").click(clickButtonGpx);
    $("#gpx-full-button").click(clickButtonGpx);
    $("#csv-button").click(clickButtonCSV);

    checkWaypoints();

    console.log("addMenu: t=" + (Date.now() - tStart) + "ms. Done ...");
    document.body.style.backgroundColor= "";

}


(function() {
    document.body.style.background= "#ffef75"; // give some "script launched" feedbacke to the user ...
    // Try to insert our menu into Komoot page
    setTimeout(addMenu, 2500); // give React some headstart ...
})();
