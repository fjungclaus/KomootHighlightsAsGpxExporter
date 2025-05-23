# "Komoot Highlights as Gpx"-Exporter

## Description
* This is a small Tampermonkey userscript to export your Komoot tour highlights as waypoints within a GPX file. 
* The exported GPX file can be imported in Garmin BaseCamp or Garmin devices. I've tested this with an Oregon 600, a Fenix 6 and a Edge 1000+.
* Might also run with Greasmonkey in Firefox, but I didn't find the time to test that until now ...
* There is also the possibility to export the Komoot highlights as comma separated values, to be imported in programs like OpenOffice Calc. This might be used to create roadbooks, etc.

## Successfully tested with ...
- 2024-10-27: Firefox 131.0.3 + Tampermonkey 5.3.1
- 2024-10-27: Chrome 130.0.6723.70 + Tampermonkey 5.3.1

## Hints
- If the menu buttons of this Tampermonkey scripts don't show up,
reloading the page (e.g. by means of 'F5') might help.

## Todos
* ~~Have distance across the track of the highlights in the waypoint and CSV~~
* ~~Allow exporting waypoints plus the GPX track itself in a single GPX file~~
* Finish code for CSV export
* About page
* Help page
* Upload some screen shots to Github

## History
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
![Screenshot ...](https://github.com/fjungclaus/KomootHighlightsAsGpxExporter/blob/bc8e36551a1e349eac6e18240b329c3711d335b7/2024-10-27%2016_06_51-2024-10-27%2015_21_39-Oktober24-Cuxi-233k-v1%20_%20Fahrradtour%20_%20Komoot.jpg)
... to be continued ...
