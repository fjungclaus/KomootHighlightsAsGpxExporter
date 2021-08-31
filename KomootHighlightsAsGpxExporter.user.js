// ==UserScript==
// @name         KomootHighlightsAsGpxExporter
// @namespace    https://github.com/fjungclaus
// @version      0.9
// @description  Save Komoot Tour Highlights as GPX-File
// @author       Frank Jungclaus, DL4XJ
// @supportURL   https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/issues
// @license      GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0.txt
// @match        https://*.komoot.de/tour/*
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @grant        GM_addStyle
// @run-at       document-idle
// // @run-at context-menu
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



var fileName = "gpx.gpx";
var showDebug = false;
var $ = window.$; // just to prevent warnings about "$ not defined" in tampermonkey editor
var dbgText = "", gpxWptText = "", gpxTrkText = "";
const kmtProps = unsafeWindow.kmtBoot.getProps();
const tour = kmtProps.page._embedded.tour;
const VERSION = GM_info.script.version;




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



// Add jquery CSS
$("head").append (
    '<link '
  + 'href="//code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css" '
  + 'rel="stylesheet" type="text/css">'
);

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
    ret+= VERSION;
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

function clickButtonDbg(ev) {
    createDebugText();
    $("body").append(dbgText);
    $("#dialog").dialog({ autoOpen: false, maxHeight: 640, width: 1024, maxWidth: 1024, close: function() { showDebug = false; } });
    showDebug = !showDebug;
    $("#dialog").dialog(showDebug ? 'open' : 'close');
}

function clickButtonGpx(ev) {
    var txt;
    createGpxWptText();
    txt = getGpxHeader("Tour=" + tour.id + ", " + sanitizeText(tour.name));
    txt+= gpxWptText;

    if (ev.currentTarget.id == "gpx-full-button") {
        createGpxTrkText();
        txt+= getGpxTrkpointHeader(sanitizeText(tour.name));
        txt+= gpxTrkText;
        txt+= getGpxTrkpointFooter();
    }

    txt+= getGpxFooter();
    saveData(txt, fileName);

}

function sanitizeFileName(name) {
    return name.replace(/ /g, "_").replace(/[^\p{L}\p{N}^$\n]/gu, '');
}

function sanitizeText(txt) {
    /*
      Removes all symbols except:
       \p{L} - all letters from any language
       \p{N} - numbers
       \p{P} - punctuation
       \p{Z} - whitespace separators
       ^$\n  - add any symbols you want to keep
    */
    return txt.replace(/[^\p{L}\p{N}\p{P}\p{Z}^$\n]/gu, '').replace(/&/g, '');;
}

// jQuery Dialog with some debug data
function createDebugText() {
    if (dbgText == "") {
        dbgText = '<div id="dialog" title="Highlights to GPX">';
        if (tour._embedded.way_points._embedded.items.length > 0) {
            fileName = 'komoot-tour-gpx-wpt-export-' + sanitizeFileName(tour.name) + '.gpx';
            dbgText+= '  <b>Tour #' + tour.id + ', ' + tour.name + '</b>';
            dbgText+= '  <table>';
            dbgText+= '<tr><th>#</th><th>Type</th><th>Name</th><th>Up</th><th>Down</th><th>Info</th><th>Lattitude</th><th>Longitude</th><th>Altitude</th><tr>';
            for (var i = 0, cnt = 0; i < tour._embedded.way_points._embedded.items.length; i++) {
                if (tour._embedded.way_points._embedded.items[i].type == "highlight") {
                    cnt++;
                    const highlight = tour._embedded.way_points._embedded.items[i]._embedded.reference;
                    console.log("i=" + i);
                    dbgText+= '<tr>';
                    dbgText+= '<td>' + cnt + '</td>';
                    dbgText+= '<td>' + highlight.type.replace('highlight_','') + '</td>';
                    dbgText+= '<td>' + highlight.name + '</td>';
                    try {
                        const tips = highlight._embedded.tips._embedded;
                        if (tips.items.length > 0) {
                            dbgText+= '<td>' + tips.items[0].rating.up + '</td>';
                            dbgText+= '<td>' + tips.items[0].rating.down + '</td>';
                            dbgText+= '<td>' + tips.items[0].text + '</td>';
                        }
                    }
                    catch {
                        dbgText+= '<td>%</td>';
                        dbgText+= '<td>%</td>';
                        dbgText+= '<td>%</td>';
                    }
                    dbgText+= '<td>' + highlight.location.lat + '</td>';
                    dbgText+= '<td>' + highlight.location.lng + '</td>';
                    dbgText+= '<td>' + highlight.location.alt + '</td>';

                    dbgText+= '</tr>';
                }
            }
            dbgText+= '  </table>';
        } else {
            dbgText+= '<p>Hmmm, a tour without any point or highlight!?</p>';
        }
        dbgText+= '</div>';

    }
}

// Get all highlights of tour as GPX waypoints
function createGpxWptText() {
    if (gpxWptText == "") {
        if (tour._embedded.way_points._embedded.items.length > 0) {
            fileName = 'komoot-tour-gpx-wpt-export-' + sanitizeFileName(tour.name) + '.gpx';
            for (var i = 0, cnt = 0; i < tour._embedded.way_points._embedded.items.length; i++) {
                if (tour._embedded.way_points._embedded.items[i].type == "highlight") {
                    cnt++;
                    const highlight = tour._embedded.way_points._embedded.items[i]._embedded.reference;
                    console.log("i=" + i);
                    var desc = "";
                    try {
                        const tips = highlight._embedded.tips._embedded;
                        if (tips.items.length > 0) {
                            //desc = sanitizeText(tips.items[0].text);
                            desc = tips.items[0].text;
                        }
                    }
                    catch {
                        desc = "";
                    }
                    gpxWptText += getGpxWaypoint(sanitizeText(highlight.name), highlight.location.lat, highlight.location.lng, highlight.location.alt, desc);
                }
            }
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

// Quick and dirty adding a menu
var countDown = 20; /* Retry to insert our menu for 20 * 1000ms */
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
  <button class="ui-button ui-widget ui-corner-all" id="gpx-full-button" >Save as GPX (+track) ...</button>&nbsp;
  <button class="ui-button ui-widget ui-corner-all" id="csv-button" >Save as CSV ...</button>&nbsp;
  <button class="ui-button ui-widget ui-corner-all" id="dbg-button" >DEBUG ...</button>&nbsp;
`;
        // add.style.cssText += "padding: 0 0 5px 0;";
        add.setAttribute('id', 'menu-add');
        pos.prepend(add); // todo ...
        $("#dbg-button").click(clickButtonDbg);
        $("#gpx-button").click(clickButtonGpx);
        $("#gpx-full-button").click(clickButtonGpx);
    }

    countDown--;
    if (countDown > 0) {
        setTimeout(addMenu, 1000);
    }
}

// Insert menu into Komoot page
setTimeout(addMenu, 1000);


