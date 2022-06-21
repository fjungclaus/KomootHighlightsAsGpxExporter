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
