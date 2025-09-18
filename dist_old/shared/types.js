"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLightroomProfileDisplayName = exports.LightroomProfile = exports.DEFAULT_STORAGE_FOLDER = void 0;
// Default storage location for recipes
exports.DEFAULT_STORAGE_FOLDER = '.film-recipes-wizard';
var LightroomProfile;
(function (LightroomProfile) {
    LightroomProfile["ADOBE_COLOR"] = "adobe-color";
    LightroomProfile["ADOBE_MONOCHROME"] = "adobe-monochrome";
    LightroomProfile["FLAT"] = "flat";
})(LightroomProfile || (exports.LightroomProfile = LightroomProfile = {}));
const getLightroomProfileDisplayName = (profile) => {
    switch (profile) {
        case LightroomProfile.ADOBE_COLOR:
            return 'Adobe Color';
        case LightroomProfile.ADOBE_MONOCHROME:
            return 'Adobe Monochrome';
        case LightroomProfile.FLAT:
            return 'Flat Profile';
        default:
            return profile;
    }
};
exports.getLightroomProfileDisplayName = getLightroomProfileDisplayName;
