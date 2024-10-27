// ==UserScript==
// @name         KomootHighlightsAsGpxExporter
// @namespace    https://github.com/fjungclaus
// @version      0.9.12
// @description  Save Komoot Tour Highlights as GPX-File
// @author       Frank Jungclaus, DL4XJ
// @supportURL   https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/issues
// @license      GPL-3.0-or-later; https://www.gnu.org/licenses/gpl-3.0.txt
// @match        https://*.komoot.com/*/tour/*
// @match        https://*.komoot.de/tour/*
// @exclude      https://*.komoot.de/tour/*/edit
// @exclude      https://*.komoot.com/tour/*/edit
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://code.jquery.com/ui/1.12.1/jquery-ui.min.js
// @grant        GM_addStyle
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



var fileName = "gpx.gpx";
var showDebug = false;
var $ = window.$; // just to prevent warnings about "$ not defined" in tampermonkey editor
var dbgText = "", gpxWptText = "", gpxTrkText = "";
var objDistances = [];
var cntHighlights = 0;
const kmtProps = unsafeWindow.kmtBoot.getProps();
const tour = kmtProps.page._embedded.tour;
const VERSION = GM_info.script.version;
const MAX_RETRY=60; // retries to install our menu (MAX_RETRY * 500ms)



/* CSS */
GM_addStyle(`
table {
  border-collapse: collapse;
  width: 1200px;
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
  margin: 0 0 5px 0 !important;
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

function clickButtonCSV(ev) {
    alert("Not yet implemented ...");
}

function clickButtonDbg(ev) {
    createDebugText();
    $("body").append(dbgText);
    $("#dialog").dialog({ autoOpen: false, maxHeight: 640, width: 1260, maxWidth: 1260, close: function() { showDebug = false; } });
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

       .replace(/[^\p{L}\p{N}\p{P}\p{Z}^$\n]/gu, '').replace(/&/g, '');
    */
    return txt.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&apos;');
}

// jQuery Dialog with some debug data
function createDebugText() {
    if (dbgText == "") {
        dbgText = '<div id="dialog" title="Highlights to GPX">';
        if (tour._embedded.way_points._embedded.items.length > 0) {
            fileName = 'komoot-tour-gpx-wpt-export-' + sanitizeFileName(tour.name) + '.gpx';
            dbgText+= '  <b>Tour #' + tour.id + ', ' + tour.name + '</b>';
            dbgText+= '  <table>';
            dbgText+= '<tr><th>#</th><th>Type</th><th>Name</th><th>Up</th><th>Down</th><th>Info</th><th>Lattitude</th><th>Longitude</th><th>Altitude</th><th>Dist</th><tr>';
            for (var i = 0, cnt = 0; i < tour._embedded.way_points._embedded.items.length; i++) {
                if (tour._embedded.way_points._embedded.items[i].attributes.type == "highlight") {
                    cnt++;
                    const highlight = tour._embedded.way_points._embedded.items[i]._syncedAttributes._embedded.reference;
                    console.log("H:i=" + i + "cnt=" + cnt);
                    dbgText+= '<tr>';
                    dbgText+= '<td>' + cnt + '</td>';
                    dbgText+= '<td>' + highlight.type.replace('highlight_','') + '</td>';
                    dbgText+= '<td>' + highlight.name + '</td>';
                    try {
                        const tips = highlight._embedded.tips._embedded;
                        if (tips.items.length > 0) {
                            const attrs = tips.items[0].attributes;
                            dbgText+= '<td>' + attrs.rating.up + '</td>';
                            dbgText+= '<td>' + attrs.rating.down + '</td>';
                            dbgText+= '<td>' + attrs.text + '</td>';
                        } else {
                            dbgText+= '<td>%</td>';
                            dbgText+= '<td>%</td>';
                            dbgText+= '<td>%</td>';
                        }
                    }
                    catch {
                        dbgText+= '<td>X</td>';
                        dbgText+= '<td>X</td>';
                        dbgText+= '<td>X</td>';
                    }
                    dbgText+= '<td>' + highlight.location.lat + '</td>';
                    dbgText+= '<td>' + highlight.location.lng + '</td>';
                    dbgText+= '<td>' + highlight.mid_point.alt + '</td>';
                    dbgText+= '<td>' + objDistances.find(element => (element.ref == highlight.id)).dst + '</td>';

                    dbgText+= '</tr>';
                } else if (tour._embedded.way_points._embedded.items[i].attributes.type == "poi") {
                    cnt++;
                    const poi = tour._embedded.way_points._embedded.items[i]._syncedAttributes._embedded.reference;
                    if (poi._embedded.details) {
                    console.log("P:i=" + i + "cnt=" + cnt);
                    dbgText+= '<tr>';
                    dbgText+= '<td>' + cnt + '</td>';
                    dbgText+= '<td>POI</td>';
                    dbgText+= '<td>' + poi.name + '</td>';
                    dbgText+= '<td>-</td>';
                    dbgText+= '<td>-</td>';
                    dbgText+= '<td>';
                    for(var j = 0; j < poi._embedded.details.items.length; j++) {
                        dbgText += '<b>' + poi._embedded.details.items[j].key + ":</b> " + sanitizeText(poi._embedded.details.items[j].formatted);
                        dbgText += '<br/>';
                    }
                    dbgText+= '</td>';
                    dbgText+= '<td>' + poi.location.lat + '</td>';
                    dbgText+= '<td>' + poi.location.lng + '</td>';
                    dbgText+= '<td>0.000</td>';
                    dbgText+= '<td>x</td>';
                    dbgText+= '</tr>';
                }
                } else {
                    console.log("P:no details!!! i=" + i + "cnt=" + cnt);
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
                if (tour._embedded.way_points._embedded.items[i].attributes.type == "highlight" ||
                    tour._embedded.way_points._embedded.items[i].attributes.type == "poi") {
                    cnt++;
                    const highlight = tour._embedded.way_points._embedded.items[i]._syncedAttributes._embedded.reference;
                    var desc = "";
                    try {
                        const tips = highlight._embedded.tips._embedded;
                        if (tips.items.length > 0) {
                            const attrs = tips.items[0].attributes;
                            desc = sanitizeText(attrs.text);
                        }
                    }
                    catch {
                        desc = "";
                    }
                    var alt = '0.000';
                    if (typeof highlight.location.alt !== 'undefined') {
                        alt = highlight.location.alt;
                    } else {
                        if (typeof highlight.mid_point !== 'undefined') {
                            alt = highlight.mid_point.alt;
                        }
                    }
                    console.log("createGpxWptText: i=" + i + "," + highlight.name + "," + highlight.location.lat + "," + highlight.location.lng);
                    gpxWptText += getGpxWaypoint(sanitizeText(highlight.name), highlight.location.lat, highlight.location.lng, alt, desc);
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


function selectorContainsText(selector, text) {
  var elements = document.querySelectorAll(selector);
  return Array.prototype.filter.call(elements, function(element){
    return RegExp(text).test(element.textContent);
  });
}

// "//a[contains(@href, '/highlight/')]",
//         text = text + node.getAttribute('href') + "\n";
// Subnode: . vor // sonst doch das ganze Dokument!
function subEval(xpath, node)
{
    // !!! trailing '.' else full document !!!
    return document.evaluate(xpath, node, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
}


// Quick and dirty adding a menu
var retry = 0; /* Retries to insert our menu */
function addMenu() {
    // check if there is a special SVG with title "loading"
    var stillLoading = selectorContainsText("title", "loading"); // length currently 6 at the beginning ... if done 4 ...

    console.log("addMenu:" + retry + ' stillLoading=' + stillLoading.length);

    if (stillLoading.length <= 4 || retry >= MAX_RETRY) {
        var add = document.createElement('div');
        add.innerHTML = '<h2><b>Tampermonkey: Save highlights+POI as GPX</b></h2>';
        add.innerHTML += '<p><small>Highlights=' + cntHighlights.toString() + ', POI=?, addMenu=' + retry.toString() + ' (re-)tries</small></p>';
        add.innerHTML += ' <button class="ui-button ui-widget ui-corner-all" id="gpx-button" title="Save highlights and POI without the GPX track itself into a GPX file" >Save as GPX ...</button>&nbsp';
        add.innerHTML += ' <button class="ui-button ui-widget ui-corner-all" id="gpx-full-button" title="Save highlights and POI plus the GPX-track in a single GPX file">Save as GPX (+track) ...</button>&nbsp';
        add.innerHTML += ' <button class="ui-button ui-widget ui-corner-all" id="csv-button" title="Save highlights and POI as CSV. Not yet implemented! Please use copy&paste to e.g. Libreoffice Calc from DEBUG-table">Save as CSV ...</button>&nbsp';
        add.innerHTML += ' <button class="ui-button ui-widget ui-corner-all" id="dbg-button" title="Table with some debug information about all highlights and POI found ...">DEBUG ...</button>&nbsp';
        // "per copy JS path" ...
        // old:
        //   var pos = document.querySelector("#pageMountNode > div > div:nth-child(3) > div.tw-bg-beige-light.lg\\:tw-bg-white.u-bg-desk-column > div.css-1u8qly9 > div > div > div > div.tw-w-full.lg\\:tw-w-2\\/5 > div > div > div");
        // new:
        var pos = document.querySelector("#pageMountNode > div > div:nth-child(3) > div.tw-bg-canvas.lg\\:tw-bg-card.u-bg-desk-column > div.css-1u8qly9 > div > div > div > div.tw-w-full.lg\\:tw-w-2\\/5");
        if (pos) {
           add.style.cssText += "padding: 0 0 0 25px;";
        } else {
            pos = document.querySelector("body"); // fallback position at first element of body ...
            add.style.cssText += "padding: 75px 0 0 0;";
        }
        add.setAttribute('id', 'menu-add');
        pos.prepend(add); // todo ...
        $("#dbg-button").click(clickButtonDbg);
        $("#gpx-button").click(clickButtonGpx);
        $("#gpx-full-button").click(clickButtonGpx);
        $("#csv-button").click(clickButtonCSV);
        retry = MAX_RETRY;
        console.log("addMenu ... Done ...");
    }

    if (retry < MAX_RETRY) { // 60 * 500ms = 30s
        setTimeout(addMenu, 500);
    }
    retry++;

}

// Try to insert out menu into Komoot page
setTimeout(addMenu, 1000);


(function() {
    'use strict';

    if (false) {
        // debug only
        var test;
        test = subEval("//script/text()", document.body);
        for (var x = 0; x < test.snapshotLength; x++) {
            console.log(test.snapshotItem(x));
        }
    }

    var courseObjs, node;
    // Get all divs with class='tw-mb-6'
    courseObjs = subEval("//div[@class='tw-mb-6']", document.body);

    cntHighlights = 0;
    for (var i = 0; i < courseObjs.snapshotLength; i++) {
        var subObjs, objs, url, name, type, dist;

        // Is course object a highlight?
        subObjs = subEval(".//a[contains(@href, '/highlight/')]", courseObjs.snapshotItem(i));
        if (subObjs.snapshotLength > 0) {
            cntHighlights++;
            // Yes, it is a highlight. Get link and name of highlight
            url = subObjs.snapshotItem(0).getAttribute('href');
            name = subObjs.snapshotItem(0).outerText;
            // Get type of highlight
            objs = subEval(".//p[@class='tw-text-secondary tw-mb-0']", courseObjs.snapshotItem(i));
            if (objs.snapshotLength > 0) {
                type = objs.snapshotItem(0).innerText;
            } else {
                type = "NIL";
            }
            // Get distance of highlight
            objs = subEval(".//div[@class='tw-mt-1 tw-text-whisper']", courseObjs.snapshotItem(i));
            if (objs.snapshotLength > 0) {
                dist = objs.snapshotItem(0).innerText;
            } else {
                dist = "UNKNOWN";
            }
            console.log(url + ":" + name + ":" + type + ":" + dist);
            try {
                objDistances.push( {ref: url.replace(/\/.*\//, ""), name: sanitizeText(name), dst: dist });
            }
            catch {
            }
        }
    }
    //alert(text);
})();



