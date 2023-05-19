# Departure Board

*WIP*

![An animated demonstration of a Pebble Time Round running Departure Board](resources/departure_board.gif)

## Building

Create a file called `apikey.js` in `src/pkjs`, obtain a free Transitland API key from https://www.transit.land/, and put your key in the file like this:

    exports.TRANSITLAND_KEY = "YOUR KEY GOES HERE"

Run `npm install` to install dependencies for backporting the PebbleKit JS code to ES5 (this is necessary for iOS and the Pebble emulator, but you need to do this to build for Android as well. If it's like 5 years from now and everything is broken and you're only building for Android anyway and you just want a quick and dirty fix, try deleting everything in `dependencies` and `devDependencies` in package.json and the `ctx.env.WEBPACK` line in wscript? I haven't tried that but I think it should work).

Then build the project with `pebble build`. Current (as of 2023) instructions for setting up the Pebble SDK can be found [here](https://github.com/andyburris/pebble-setup).

## LICENSE

[MPL 2.0](LICENSE.txt)