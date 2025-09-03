# "Komoot Highlights as Gpx"-Exporter

## Description
* This is a small Tampermonkey userscript to export your Komoot tour highlights as waypoints within a GPX file. 
* The exported GPX file can be imported in Garmin BaseCamp or Garmin devices. I've tested this with an Oregon 600, a Fenix 6, an Edge 1030+ and an Edge 1040.
* Might also run with Greasemonkey in Firefox, but I didn't find the time to test that until now ...
* There is also the possibility to export the Komoot highlights as comma separated values, to be imported in programs like OpenOffice Calc. This might be used to create roadbooks, etc.

## Successfully tested with ...
- 0.9.44:
   - 2025-09-03: Firefox 142.0.1 on a tablet with Android 15 + Tampermonkey 5.3.3
- 0.9.39:
   - 2025-06-01: Firefox 139.0.1 + Tampermonkey V5.3.3
   - 2025-06-01: Chrome 137.0.7151.56 + Tampermonkey V5.3.3
   - 2025-06-01: CSV import to LibreOffice Calc 25.2.3.2
   - 2025-06-01: GPX import into Garmin BaseCamp 4.7.5
   - 2025-06-01: GPX import into GarminConnect (https://connect.garmin.com/modern/courses)
- 0.9.14:
   - 2024-10-27: Firefox 131.0.3 + Tampermonkey 5.3.1
   - 2024-10-27: Chrome 130.0.6723.70 + Tampermonkey 5.3.1

## Hints
- If the menu buttons of this Tampermonkey scripts don't show up, reloading the page (e.g. by means of 'F5') might help
- Since 0.9.39 there will be a yellowish bar on the Komoot page during insertion of the script's menu
![Screenshot ...](https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/blob/main/screenshots/2025-06-01%2016_46_19-yellowish-line-during-menu-insertion.jpg)
- Use the button "Save as GPX (+ track)" to save highlights and POIs plus the GPX-track itself in a single GPX file
![Screenshot ...](https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/blob/main/screenshots/2025-06-01%2017_12_29-button-gpx-plus-track.jpg)
- Firefox 142 + Tampermonkey on Android currently only works if you activate FF's desktop-website mode. My menu does not properly appear for the Komoot mobile website. Fix in progress ...

## Todos
* ~~Have distance across the track of the highlights in the waypoint and CSV~~
* ~~Allow exporting waypoints plus the GPX track itself in a single GPX file~~
* ~~Finish code for CSV export~~
* About page
* Help page
* Upload some screen shots to Github
* Make highlight names editable in the preview dialog (e.g. Garmin Edge allows max. 15 chars for a waypoint's name)
* Some words about installing Tampermonkey and how to add this script
* ~~Put link to KomootHighlightsAsGpxExporter @ github into the status element~~

## History
* 0.9.45, 2025-09-03
   * Try an alternative menu position for devices with small displays / mobile devices. [See problem reported by luogni](https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/issues/5#issue-3327351091)
* 0.9.44, 2025-09-03
   * Use mime type application/gpx+xml (and text/csv) instead of a simple text/plain, to get proper file suffixes for Firefox on Android, too. [Problem reported by luogni](https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/issues/6#issue-3327352630)
* 0.9.42, 2025-06-06
   * [As reported by ezloj](https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/issues/3#issuecomment-2948301309) it is also necessary to match against URLs like https://www.komoot.com/tour/*
   * Added some more URLs to exclude, because we don't want this script to kick in while editing, planning or customizing routes ...
* 0.9.41, 2025-06-04
   * Some small CSS changes
   * Added link to github page
* 0.9.40, 2025-06-01
   * Massive rework / rewrite and some code cleanup
   * No longer scrape the highlight's distance along track from the page's HTML source. Self calculate this within the script.
   * Try to fetch names and coordinates of highlights with incomplete data by means of background xmlHttpRequests
   * Implemented export as CSV
   * Added some new screenshots   
* 0.9.17, 2025-05-15
   * [As reported by malnvenshorn](https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/issues/2#issuecomment-2873009891) highlight #29 within https://www.komoot.com/de-de/tour/992841160 does not have a
     tour._embedded.way_points._embedded.items[i]._syncedAttributes._embedded property.
     This caused an exception which terminates the script.
     Intermediate quick fix by adding a try/catch-block which should skip such a highlight (user will see an alert box then).
     A better solution will (hopefully) follow ...
* 0.9.16, 2024-10-29
   * Tried to make use of @updateURL and @downloadURL
* 0.9.14, 2024-10-27
   * Minor change only: Display Greasemonkey and script version numbers
* 0.9.13, 2024-10-27
   * Quick&dirty fix for highlights with undefined name or mid_point
* 0.9.12, 2024-10-27
   * The latest changes by Komoot broke my script. They did some changes to naming and layout of
some of their data structures from which I fetch "my" data of highlights and POI ... 
The pain of people who scrape their information from a website without using an official API ;) 
Fixed until their next changes ...
* 0.9.11, 2024-09-13
   * Small fix for table with debug output
* 0.9.10, 2024-02-23
  * Added new URL to match against (https://*.komoot.com/de-de/tour/*)
* 0.9.9, 2023-03-14
  * Try to replace alt(itude) with highlight.mid_point.alt or '0.000'
* 0.9.8, 2022-12-09
  * Rework for address code changes @komoot regarding the "loading"-indicator
* 0.9.7, 2022-11-03
  * Try to prevent using this script while editing a komoot tour (by means of using an @exclude parameter)
* 0.9.6, 2022-06-21
  * Fixed addMenu (there seems to have been some changes @komoot)
  * Merge from experimental branch:
    * Addded POI to debug output
    * Warn about the still not available "save-as-gps"-functionality
    * Sanitize xml-text to make Garmin basecamp happy
    * Try to fetch distance of highlights along the track
* 0.5, 2021-08-30, Added timestamps to track elements
* 0.4, 2021-08-27, Also allow exporting the tours track itself
* 0.1, 2021-08-25, First release via Github

## Screenshots
### Preview
![Screenshot ...](https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/blob/main/screenshots/2025-06-01%2016_43_29-CUX%20V4%20mit%20Umfahrung%20gesp.%20Geeste-Br%C3%BCcke%2C%20231k%20_%20Fahrradtour%20_%20Komoot%20%E2%80%93%20Mozilla-1280px.jpg)
### CSV Export + Import
![Screenshot ...](https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/blob/main/screenshots/2025-06-01%2016_36_38-_csv-import-libre-office-1280px.jpg)
... to be continued ...
