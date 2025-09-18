import { BrowserWindow } from 'electron';
export declare class FileHandlers {
    private getMainWindow;
    constructor(getMainWindow: () => BrowserWindow | null);
    setupHandlers(): void;
}
