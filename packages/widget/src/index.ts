import './styles.css';

interface ElastiConfig {
  projectId: string;
  apiUrl: string;
  theme?: 'light' | 'dark';
  position?: 'bottom-right' | 'bottom-left';
  welcomeMessage?: string;
}

class ElastiWidget {
  private config: ElastiConfig;
  private container: HTMLDivElement | null = null;
  private isOpen = false;
  private messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  constructor(config: ElastiConfig) {
    this.config = {
      theme: 'light',
      position: 'bottom-right',
      welcomeMessage: 'Hi! Ask me anything about this website.',
      ...config,
    };
    this.init();
  }

  private init() {
    // Create container with Shadow DOM for style isolation
    this.container = document.createElement('div');
    this.container.id = 'elasti-widget-container';
    document.body.appendChild(this.container);

    const shadow = this.container.attachShadow({ mode: 'open' });
    shadow.innerHTML = this.getStyles() + this.getHTML();

    this.bindEvents(shadow);
    this.addMessage('assistant', this.config.welcomeMessage!);
  }

  private getStyles(): string {
    const position = this.config.position === 'bottom-left'
      ? 'left: 20px;'
      : 'right: 20px;';
    const isDark = this.config.theme === 'dark';

    return `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .elasti-button {
          position: fixed;
          bottom: 20px;
          ${position}
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s;
          z-index: 9999;
        }

        .elasti-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
        }

        .elasti-button svg {
          width: 28px;
          height: 28px;
          fill: white;
        }

        .elasti-chat {
          position: fixed;
          bottom: 90px;
          ${position}
          width: 380px;
          height: 520px;
          background: ${isDark ? '#1a1a2e' : '#ffffff'};
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          display: none;
          flex-direction: column;
          overflow: hidden;
          z-index: 9998;
        }

        .elasti-chat.open {
          display: flex;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .elasti-header {
          padding: 16px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .elasti-header h3 {
          font-size: 16px;
          font-weight: 600;
        }

        .elasti-header p {
          font-size: 12px;
          opacity: 0.9;
          margin-top: 2px;
        }

        .elasti-messages {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          background: ${isDark ? '#16213e' : '#f8f9fa'};
        }

        .elasti-message {
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
        }

        .elasti-message.user {
          align-items: flex-end;
        }

        .elasti-message.assistant {
          align-items: flex-start;
        }

        .elasti-bubble {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.5;
        }

        .elasti-message.user .elasti-bubble {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .elasti-message.assistant .elasti-bubble {
          background: ${isDark ? '#1a1a2e' : '#ffffff'};
          color: ${isDark ? '#e0e0e0' : '#333333'};
          border-bottom-left-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .elasti-input-area {
          padding: 16px;
          background: ${isDark ? '#1a1a2e' : '#ffffff'};
          border-top: 1px solid ${isDark ? '#2a2a4e' : '#eee'};
          display: flex;
          gap: 10px;
        }

        .elasti-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid ${isDark ? '#2a2a4e' : '#e0e0e0'};
          border-radius: 24px;
          font-size: 14px;
          outline: none;
          background: ${isDark ? '#16213e' : '#f8f9fa'};
          color: ${isDark ? '#e0e0e0' : '#333333'};
        }

        .elasti-input:focus {
          border-color: #667eea;
        }

        .elasti-send {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .elasti-send:hover {
          transform: scale(1.05);
        }

        .elasti-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .elasti-send svg {
          width: 20px;
          height: 20px;
          fill: white;
        }

        .elasti-typing {
          display: flex;
          gap: 4px;
          padding: 8px 0;
        }

        .elasti-typing span {
          width: 8px;
          height: 8px;
          background: #667eea;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }

        .elasti-typing span:nth-child(1) { animation-delay: -0.32s; }
        .elasti-typing span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        .elasti-sources {
          margin-top: 8px;
          font-size: 12px;
        }

        .elasti-sources a {
          color: #667eea;
          text-decoration: none;
        }

        .elasti-sources a:hover {
          text-decoration: underline;
        }

        .elasti-cross-refs {
          margin-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.1);
          padding-top: 8px;
        }

        .elasti-cross-refs-header {
          font-size: 11px;
          text-transform: uppercase;
          color: #888;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .elasti-cross-ref-group {
          margin-bottom: 6px;
        }

        .elasti-cross-ref-title {
          font-size: 12px;
          font-weight: 500;
          color: #555;
        }

        .elasti-cross-ref-link {
          display: block;
          font-size: 12px;
          color: #667eea;
          text-decoration: none;
          padding-left: 8px;
          margin-top: 2px;
        }

        .elasti-cross-ref-link:hover {
          text-decoration: underline;
        }
      </style>
    `;
  }

  private getHTML(): string {
    return `
      <button class="elasti-button" id="elasti-toggle">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
      </button>

      <div class="elasti-chat" id="elasti-chat">
        <div class="elasti-header">
          <h3>Chat with us</h3>
          <p>Ask anything about this website</p>
        </div>
        <div class="elasti-messages" id="elasti-messages"></div>
        <div class="elasti-input-area">
          <input type="text" class="elasti-input" id="elasti-input" placeholder="Type your question...">
          <button class="elasti-send" id="elasti-send">
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  private bindEvents(shadow: ShadowRoot) {
    const toggle = shadow.getElementById('elasti-toggle')!;
    const chat = shadow.getElementById('elasti-chat')!;
    const input = shadow.getElementById('elasti-input') as HTMLInputElement;
    const send = shadow.getElementById('elasti-send')!;

    toggle.addEventListener('click', () => {
      this.isOpen = !this.isOpen;
      chat.classList.toggle('open', this.isOpen);
    });

    send.addEventListener('click', () => this.sendMessage(shadow));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendMessage(shadow);
    });
  }

  private async sendMessage(shadow: ShadowRoot) {
    const input = shadow.getElementById('elasti-input') as HTMLInputElement;
    const question = input.value.trim();

    if (!question) return;

    input.value = '';
    this.addMessage('user', question);
    this.renderMessages(shadow);

    // Show typing indicator
    this.showTyping(shadow, true);

    try {
      const response = await fetch(`${this.config.apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: this.config.projectId,
          question,
        }),
      });

      const data = await response.json();

      let answer = data.answer;

      // Append sources
      if (data.sources?.length > 0) {
        const sourceLinks = data.sources
          .map((s: any) => `<a href="${s.url}" target="_blank">${s.title}</a>`)
          .join(', ');
        answer += `<div class="elasti-sources"><strong>Sources:</strong> ${sourceLinks}</div>`;
      }

      // Append cross-references (Related Resources)
      if (data.crossReferences?.length > 0) {
        const crossRefHtml = data.crossReferences.map((ref: any) => `
                    <div class="elasti-cross-ref-group">
                        <div class="elasti-cross-ref-title">From ${ref.project}:</div>
                        ${ref.results.map((r: any) => `<a href="${r.url}" target="_blank" class="elasti-cross-ref-link">${r.title}</a>`).join('')}
                    </div>
                `).join('');

        answer += `
                    <div class="elasti-cross-refs">
                        <div class="elasti-cross-refs-header">Related Resources</div>
                        ${crossRefHtml}
                    </div>
                `;
      }

      this.addMessage('assistant', answer);
    } catch (error) {
      this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    } finally {
      this.showTyping(shadow, false);
      this.renderMessages(shadow);
    }
  }

  private addMessage(role: 'user' | 'assistant', content: string) {
    this.messages.push({ role, content });
  }

  private renderMessages(shadow: ShadowRoot) {
    const container = shadow.getElementById('elasti-messages')!;
    container.innerHTML = this.messages
      .map(msg => `
        <div class="elasti-message ${msg.role}">
          <div class="elasti-bubble">${msg.content}</div>
        </div>
      `)
      .join('');
    container.scrollTop = container.scrollHeight;
  }

  private showTyping(shadow: ShadowRoot, show: boolean) {
    const container = shadow.getElementById('elasti-messages')!;
    const existing = container.querySelector('.elasti-typing-container');

    if (show && !existing) {
      const typingHtml = `
        <div class="elasti-message assistant elasti-typing-container">
          <div class="elasti-bubble">
            <div class="elasti-typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      `;
      container.insertAdjacentHTML('beforeend', typingHtml);
      container.scrollTop = container.scrollHeight;
    } else if (!show && existing) {
      existing.remove();
    }
  }
}

// Auto-initialize from script tag attributes
(function () {
  const script = document.currentScript as HTMLScriptElement;
  if (script) {
    const projectId = script.getAttribute('data-project-id');
    const apiUrl = script.getAttribute('data-api-url') || 'http://localhost:3000';
    const theme = script.getAttribute('data-theme') as 'light' | 'dark' || 'light';
    const position = script.getAttribute('data-position') as 'bottom-right' | 'bottom-left' || 'bottom-right';

    if (projectId) {
      new ElastiWidget({ projectId, apiUrl, theme, position });
    } else {
      console.error('Elasti Widget: data-project-id attribute is required');
    }
  }
})();

export { ElastiWidget };
