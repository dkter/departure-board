/*
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/

exports.VehicleType = {
    "STREETCAR": 0,
    "SUBWAY": 1,
    "BUS": 2,
    "REGIONAL_TRAIN": 3,
}

exports.RouteShape = {
    "ROUNDRECT": 0,
    "RECT": 1,
    "CIRCLE": 2,
}

exports.GColor = {
    "GColorBlackARGB8": 0b11000000,
    "GColorOxfordBlueARGB8": 0b11000001,
    "GColorDukeBlueARGB8": 0b11000010,
    "GColorBlueARGB8": 0b11000011,
    "GColorDarkGreenARGB8": 0b11000100,
    "GColorMidnightGreenARGB8": 0b11000101,
    "GColorCobaltBlueARGB8": 0b11000110,
    "GColorBlueMoonARGB8": 0b11000111,
    "GColorIslamicGreenARGB8": 0b11001000,
    "GColorJaegerGreenARGB8": 0b11001001,
    "GColorTiffanyBlueARGB8": 0b11001010,
    "GColorVividCeruleanARGB8": 0b11001011,
    "GColorGreenARGB8": 0b11001100,
    "GColorMalachiteARGB8": 0b11001101,
    "GColorMediumSpringGreenARGB8": 0b11001110,
    "GColorCyanARGB8": 0b11001111,
    "GColorBulgarianRoseARGB8": 0b11010000,
    "GColorImperialPurpleARGB8": 0b11010001,
    "GColorIndigoARGB8": 0b11010010,
    "GColorElectricUltramarineARGB8": 0b11010011,
    "GColorArmyGreenARGB8": 0b11010100,
    "GColorDarkGrayARGB8": 0b11010101,
    "GColorLibertyARGB8": 0b11010110,
    "GColorVeryLightBlueARGB8": 0b11010111,
    "GColorKellyGreenARGB8": 0b11011000,
    "GColorMayGreenARGB8": 0b11011001,
    "GColorCadetBlueARGB8": 0b11011010,
    "GColorPictonBlueARGB8": 0b11011011,
    "GColorBrightGreenARGB8": 0b11011100,
    "GColorScreaminGreenARGB8": 0b11011101,
    "GColorMediumAquamarineARGB8": 0b11011110,
    "GColorElectricBlueARGB8": 0b11011111,
    "GColorDarkCandyAppleRedARGB8": 0b11100000,
    "GColorJazzberryJamARGB8": 0b11100001,
    "GColorPurpleARGB8": 0b11100010,
    "GColorVividVioletARGB8": 0b11100011,
    "GColorWindsorTanARGB8": 0b11100100,
    "GColorRoseValeARGB8": 0b11100101,
    "GColorPurpureusARGB8": 0b11100110,
    "GColorLavenderIndigoARGB8": 0b11100111,
    "GColorLimerickARGB8": 0b11101000,
    "GColorBrassARGB8": 0b11101001,
    "GColorLightGrayARGB8": 0b11101010,
    "GColorBabyBlueEyesARGB8": 0b11101011,
    "GColorSpringBudARGB8": 0b11101100,
    "GColorInchwormARGB8": 0b11101101,
    "GColorMintGreenARGB8": 0b11101110,
    "GColorCelesteARGB8": 0b11101111,
    "GColorRedARGB8": 0b11110000,
    "GColorFollyARGB8": 0b11110001,
    "GColorFashionMagentaARGB8": 0b11110010,
    "GColorMagentaARGB8": 0b11110011,
    "GColorOrangeARGB8": 0b11110100,
    "GColorSunsetOrangeARGB8": 0b11110101,
    "GColorBrilliantRoseARGB8": 0b11110110,
    "GColorShockingPinkARGB8": 0b11110111,
    "GColorChromeYellowARGB8": 0b11111000,
    "GColorRajahARGB8": 0b11111001,
    "GColorMelonARGB8": 0b11111010,
    "GColorRichBrilliantLavenderARGB8": 0b11111011,
    "GColorYellowARGB8": 0b11111100,
    "GColorIcterineARGB8": 0b11111101,
    "GColorPastelYellowARGB8": 0b11111110,
    "GColorWhiteARGB8": 0b11111111,
}

exports.Error = {
    "NO_CONNECTION": -1,
    "INVALID_API_KEY": -2,
    "NO_RESULTS": -3,
    "UNKNOWN_API_ERROR": -4,
    "LOCATION_ACCESS_DENIED": -5,
    "UNKNOWN_LOCATION_ERROR": -6,
    "COULD_NOT_SEND_MESSAGE": -7,
}

exports.agencies_by_onestop_name = {
    "grandrivertransit": "grt",
}