# "Komoot Highlights as Gpx"-Exporter

## Description
* This is a small Tampermonkey userscript to export your Komoot tour highlights as waypoints within a GPX file. 
* The exported GPX file can be imported in Garmin BaseCamp or Garmin devices. I've tested this with an Oregon 600, a Fenix 6 and a Edge 1000+.
* Might also run with Greasmonkey in Firefox, but I didn't find the time to test that until now ...
* There is also the possibility to export the Komoot highlights as comma separated values, to be imported in programs like OpenOffice Calc. This might be used to create roadbooks, etc.

## Todos
* ~~Have distance across the track of the highlights in the waypoint and CSV~~
* ~~Allow exporting waypoints plus the GPX track itself in a single GPX file~~
* Finish code for CSV export
* About page
* Help page
* Upload some screen shots to Github

## History
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
