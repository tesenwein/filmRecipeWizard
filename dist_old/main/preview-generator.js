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
exports.generatePreviewFile = generatePreviewFile;
const electron_1 = require("electron");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const image_processing_service_1 = require("../services/image-processing-service");
async function generatePreviewFile(args) {
    let outDir;
    if (args.processId) {
        const userData = electron_1.app.getPath('userData');
        const baseDir = path.join(userData, 'recipes', args.processId, 'previews');
        outDir = args.subdir ? path.join(baseDir, args.subdir) : baseDir;
    }
    else {
        const os = await Promise.resolve().then(() => __importStar(require('os')));
        outDir = path.join(os.tmpdir(), 'film-recipe-wizard-previews');
    }
    await fs.mkdir(outDir, { recursive: true });
    const srcName = (() => {
        const p = args.path || '';
        const name = p ? path.basename(p) : 'preview';
        return name.replace(/\s+/g, '-').replace(/[^A-Za-z0-9._-]/g, '') || 'preview';
    })();
    const outPath = path.join(outDir, `${Date.now()}-${Math.floor(Math.random() * 1e6)}-${srcName}.jpg`);
    try {
        if (args.path) {
            await image_processing_service_1.imageProcessingService.generatePreview(args.path, outPath, {
                maxWidth: 1024,
                maxHeight: 1024,
                quality: 92
            });
        }
        else if (args.dataUrl) {
            await image_processing_service_1.imageProcessingService.generatePreviewFromDataUrl(args.dataUrl, outPath, {
                maxWidth: 1024,
                maxHeight: 1024,
                quality: 92
            });
        }
        else {
            throw new Error('No input provided for preview');
        }
        return outPath;
    }
    catch (error) {
        console.error('[PREVIEW] Error generating preview:', error);
        throw new Error(`Failed to generate preview: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
