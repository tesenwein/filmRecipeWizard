/**
 * Simple markdown to HTML converter service
 * Handles basic markdown formatting for the renderer process
 */
export class MarkdownService {
    /**
     * Convert basic markdown text to HTML
     * @param text - The markdown text to convert
     * @returns HTML string with basic formatting
     */
    static toHtml(text: string): string {
        if (!text) return '';

        return text
            // Headers #### Header, ### Header, ## Header, # Header
            .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // Bullet points - and *
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/^\* (.*$)/gm, '<li>$1</li>')
            // Bold text **text** or __text__
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            // Italic text *text* or _text_
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            // Code `code`
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Wrap consecutive list items in ul tags
            .replace(/(<li>.*<\/li>(\s*<li>.*<\/li>)*)/g, '<ul>$1</ul>')
            // Line breaks
            .replace(/\n/g, '<br>')
            // Clean up any double line breaks
            .replace(/<br><br>/g, '<br>');
    }

    /**
     * Get CSS styles for markdown elements
     * @returns MUI sx styles object for markdown elements
     */
    static getStyles() {
        return {
            lineHeight: 1.6,
            color: 'text.primary',
            wordBreak: 'break-word' as const,
            '& h1': {
                fontSize: '1.5rem',
                fontWeight: 600,
                margin: '0 0 8px 0',
                color: 'text.primary'
            },
            '& h2': {
                fontSize: '1.25rem',
                fontWeight: 600,
                margin: '0 0 6px 0',
                color: 'text.primary'
            },
            '& h3': {
                fontSize: '1.1rem',
                fontWeight: 600,
                margin: '0 0 4px 0',
                color: 'text.primary'
            },
            '& h4': {
                fontSize: '1rem',
                fontWeight: 600,
                margin: '0 0 3px 0',
                color: 'text.primary'
            },
            '& ul': {
                margin: '0 0 8px 0',
                paddingLeft: '20px'
            },
            '& li': {
                marginBottom: '2px',
                listStyleType: 'disc'
            },
            '& strong': { fontWeight: 600 },
            '& em': { fontStyle: 'italic' },
            '& code': {
                backgroundColor: 'grey.100',
                padding: '2px 4px',
                borderRadius: 1,
                fontSize: '0.85em',
                fontFamily: 'monospace'
            }
        };
    }

    /**
     * Check if text contains markdown formatting
     * @param text - Text to check
     * @returns true if text contains markdown syntax
     */
    static hasMarkdown(text: string): boolean {
        if (!text) return false;

        return /(\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_|`.*?`)/.test(text);
    }

    /**
     * Strip markdown formatting from text
     * @param text - Text with markdown
     * @returns Plain text without markdown
     */
    static toPlainText(text: string): string {
        if (!text) return '';

        return text
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/__(.*?)__/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/_(.*?)_/g, '$1')
            .replace(/`(.*?)`/g, '$1')
            .replace(/\n/g, ' ');
    }
}
