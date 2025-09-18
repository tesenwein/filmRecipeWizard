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
exports.ImageProcessor = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const ai_streaming_service_1 = require("../services/ai-streaming-service");
const camera_profile_generator_1 = require("./camera-profile-generator");
const lut_generator_1 = require("./lut-generator");
const preview_generator_1 = require("./preview-generator");
const profile_exporter_1 = require("./profile-exporter");
const settings_service_1 = require("./settings-service");
const xmp_generator_1 = require("./xmp-generator");
class ImageProcessor {
    constructor() {
        this.aiStreamingService = null;
        this.settingsService = new settings_service_1.SettingsService();
    }
    async ensureAIStreamingService() {
        if (!this.aiStreamingService) {
            console.log('[PROCESSOR] Creating new AI streaming service...');
            const settings = await this.settingsService.loadSettings();
            console.log('[PROCESSOR] Settings loaded, has API key:', !!settings.openaiKey);
            this.aiStreamingService = new ai_streaming_service_1.AIStreamingService(settings.openaiKey || '', 'gpt-4o');
        }
        return this.aiStreamingService;
    }
    async matchStyle(data) {
        console.log('[PROCESSOR] Starting matchStyle with data:', {
            hasBaseImagePath: !!data.baseImagePath,
            hasTargetImagePath: !!data.targetImagePath,
            hasPrompt: !!data.prompt,
            hasBaseImageBase64: !!data.baseImageBase64,
            hasTargetImageBase64: !!data.targetImageBase64,
            hasStyleOptions: !!data.styleOptions,
        });
        const streamingService = await this.ensureAIStreamingService();
        console.log('[PROCESSOR] AI Streaming Service available');
        try {
            console.log('[PROCESSOR] Calling AI streaming service...');
            const aiAdjustments = await streamingService.analyzeColorMatchWithStreaming(data.baseImageBase64, data.targetImageBase64, data.prompt, // hint/prompt
            {
                onUpdate: update => {
                    // Pass the structured streaming update
                    if (data.onStreamUpdate) {
                        data.onStreamUpdate(update);
                    }
                },
                preserveSkinTones: !!data.styleOptions?.preserveSkinTones,
                lightroomProfile: data.styleOptions?.lightroomProfile,
                aiFunctions: data.styleOptions?.aiFunctions,
            });
            console.log('[PROCESSOR] AI analyzer returned:', {
                hasAdjustments: !!aiAdjustments,
                presetName: aiAdjustments?.preset_name,
                confidence: aiAdjustments?.confidence,
            });
            // No longer generating processed images - just return analysis
            return {
                success: true,
                outputPath: data.targetImagePath, // Return original path since we're not processing
                metadata: {
                    aiAdjustments,
                    confidence: aiAdjustments.confidence,
                    reasoning: aiAdjustments.reasoning,
                    usedSettings: {
                        preserveSkinTones: !!data.styleOptions?.preserveSkinTones,
                    },
                },
            };
        }
        catch (error) {
            console.error('[PROCESSOR] AI style matching failed:', error);
            throw error;
        }
    }
    async generatePreview(args) {
        try {
            return await (0, preview_generator_1.generatePreviewFile)(args);
        }
        catch (error) {
            console.error('[PROCESSOR] Failed to generate preview:', error);
            throw error;
        }
    }
    // Set OpenAI API key
    async setOpenAIKey(key) {
        await this.settingsService.saveSettings({ openaiKey: key });
        // Reset AI streaming service to use new key
        this.aiStreamingService = null;
    }
    async generateLightroomPreset(data) {
        try {
            // Create presets directory
            const presetsDir = path.join(process.cwd(), 'presets');
            await fs.mkdir(presetsDir, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const presetPath = path.join(presetsDir, `Film Recipe Wizard-${timestamp}.xmp`);
            // Generate XMP preset content
            const xmpContent = (0, xmp_generator_1.generateXMPContent)(data.adjustments, data.include, data.styleOptions?.aiFunctions);
            await fs.writeFile(presetPath, xmpContent, 'utf8');
            return {
                success: true,
                outputPath: presetPath,
                metadata: {
                    presetName: `Film Recipe Wizard-${timestamp}.xmp`,
                    groupFolder: 'film-recipe-wizard',
                    aiAdjustments: data.adjustments,
                },
            };
        }
        catch (error) {
            console.error('[PROCESSOR] Preset generation failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async generateLightroomProfile(data) {
        try {
            const result = await (0, profile_exporter_1.exportLightroomProfile)(data.sourceXmpPath, data.outputDir);
            if (!result.success) {
                return { success: false, error: result.error || 'Profile export failed' };
            }
            return {
                success: true,
                outputPath: result.outputPath,
                metadata: { presetName: result.metadata?.profileName, groupFolder: 'profiles' },
            };
        }
        catch (error) {
            console.error('[PROCESSOR] Profile export failed:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async generateCameraProfile(data) {
        try {
            const adjustments = data?.adjustments || {};
            // Get AI-generated name directly from adjustments (same as preset export)
            const profileName = adjustments.preset_name || 'Camera Profile';
            // Generate a simple camera profile XMP
            // Camera profiles use lookup tables and tone curves for color grading
            const xmpContent = (0, camera_profile_generator_1.generateCameraProfileXMP)(profileName, adjustments);
            return {
                success: true,
                xmpContent,
            };
        }
        catch (error) {
            console.error('[PROCESSOR] Camera profile generation failed:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    // Use centralized XMP generator implementation
    generateXMPContent(aiAdjustments, include, aiFunctions) {
        return (0, xmp_generator_1.generateXMPContent)(aiAdjustments, include, aiFunctions);
    }
    generateLUTContent(aiAdjustments, size = 33, format = 'cube') {
        return (0, lut_generator_1.generateLUTContent)(aiAdjustments, size, format);
    }
}
exports.ImageProcessor = ImageProcessor;
