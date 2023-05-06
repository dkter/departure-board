# Departure Board

*WIP*

![An animated demonstration of a Pebble Time Round running Departure Board](resources/departure_board.gif)

## Building

Create a file called `apikey.js` in `src/pkjs`, obtain a free Transitland API key from https://www.transit.land/, and put your key in the file like this:

    exports.TRANSITLAND_KEY = "YOUR KEY GOES HERE"

Then build the project with `pebble build`. Current (as of 2023) instructions for setting up the Pebble SDK can be found [here](https://github.com/andyburris/pebble-setup).

## LICENSE

[MPL 2.0](LICENSE.txt)