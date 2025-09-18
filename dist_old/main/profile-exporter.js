"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportLightroomProfile = exportLightroomProfile;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
/**
 * Exports a Lightroom/Camera Raw Profile (.xmp) by copying an existing profile XMP
 * into the project output folder. Validates that the XMP appears to be a Look/Profile
 * by checking for crs:PresetType="Look" or presence of RGBTable/Table_ entries.
 */
async function exportLightroomProfile(sourceXmpPath, outDir) {
    try {
        const resolved = path.resolve(sourceXmpPath);
        const contents = await fs.readFile(resolved, 'utf8');
        // Simple validation: ensure it's an XMP Look/Profile
        const isLook = /crs:PresetType\s*=\s*"Look"/.test(contents) || /crs:RGBTable=/.test(contents);
        if (!isLook) {
            return { success: false, error: 'Provided XMP is not a Lightroom Profile (Look) XMP' };
        }
        const nameMatch = contents.match(/<crs:Name>\s*<rdf:Alt>\s*<rdf:li [^>]*>([^<]*)<\/rdf:li>/);
        const profileName = nameMatch?.[1] || path.basename(resolved, '.xmp');
        const targetDir = outDir || path.join(process.cwd(), 'profiles');
        await fs.mkdir(targetDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${profileName.replace(/\s+/g, '-')}-${timestamp}.xmp`;
        const dest = path.join(targetDir, fileName);
        await fs.writeFile(dest, contents, 'utf8');
        return { success: true, outputPath: dest, metadata: { profileName } };
    }
    catch (e) {
        return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
}
