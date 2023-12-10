# Departure Board

*WIP*

![An animated demonstration of a Pebble Time Round running Departure Board](resources/departure_board.gif)

## Building

Create a file called `apikey.js` in `src/pkjs`, obtain a free Transitland API key from https://www.transit.land/, and put your key in the file like this:

    exports.TRANSITLAND_KEY = "YOUR KEY GOES HERE"

If you have a [TransSee](https://transsee.ca) premium subscription, you can also add your TransSee user ID for real-time predictions:

    exports.TRANSSEE_USERID = "YOUR USER ID GOES HERE"

Run `npm install` to install dependencies for backporting the PebbleKit JS code to ES5 (this is necessary for iOS and the Pebble emulator, but you need to do this to build for Android as well. If it's like 5 years from now and everything is broken and you're only building for Android anyway and you just want a quick and dirty fix, try deleting everything in `dependencies` and `devDependencies` in package.json and the `ctx.env.WEBPACK` line in wscript? I haven't tried that but I think it should work).

Then build the project with `pebble build`. Current (as of 2023) instructions for setting up the Pebble SDK can be found [here](https://github.com/andyburris/pebble-setup).

## Development status

*(as of December 2023)*

I'm still working on this during my spare time, though I'm preoccupied with classes most of the time. I wouldn't consider it entirely stable just yet, but I do use it myself regularly and it works pretty well with the transit systems I normally use (Toronto TTC, Kitchener/Waterloo GRT and GO Transit). If any fellow Pebble owners want to try it out themselves and let me know how it works with their systems, let me know.

There's a file called [operator_corrections.js](src/pkjs/operator_corrections.js) that's used for correcting formatting issues (for example, in Toronto I remove "St"/"Rd"/"Ave" from bus stop names) so that the data I'm getting fits on the tiny watch screen. If there's a correction you'd like to make for a transit system that you use, feel free to edit that file and submit a pull request. I'm happy to help if needed.

Also, this app only supports the Pebble Time Round at the moment, because that's the one I have. There are emulators that I can use to test and develop for other Pebbles, but I haven't gotten around to it yet. Supporting other Pebbles should just amount to a few layout changes.

## LICENSE

[MPL 2.0](LICENSE.txt)