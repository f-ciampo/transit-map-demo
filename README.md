WIP demo of transit map that starts schematic and becomes geographic as you zoom in.

You can access the demo for the city of Buenos Aires at [demo.transit.ar](https://demo.transit.ar)

It currently does not support mobile and it may not work properly on UHD monitors.

## Main things TODO in order:
- Add attribution for things used
- Add coord. snapping to axis and diagonals for editing
- Finish the subte demo lines
- Adjust size of things on small and UHD screens
- Fix map breaking when resizing window
- Improve the raster layer tiles
- Improve raster layer performance and cancel requests for tiles that are no longer visible
- Improve movement logic, make zoom contiguous instead of stepped and only snap to rounded zs when finishing
- Add support for station entrances that merge into the station node when zooming out
- Add the ability to click on stations
- Add the rest of the railways and bus lanes to the demo map

- Decouple the demo for CABA from the map and add UI for changing map source
- Add UI for editing so that other maps can be made
- Add location search and make it automatically displace them for all zoom levels
