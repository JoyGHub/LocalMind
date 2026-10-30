import { Component, h, State, Prop } from '@stencil/core';
import { Message } from '../../types/interfaces';
import { WELCOME_MESSAGES } from '../../constants/constants';

@Component({
  tag: 'localmind-welcome',
  styleUrl: 'localmind-welcome.css',
  shadow: true,
  assetsDirs: ['assets'],
})
export class LocalMindWelcome {
  @Prop() chatHistory: Message[] = [];
  @Prop() attachedFiles: File[] = [];
  @State() visibleIndices: number[] = [];

  text: string;

  componentWillLoad() {
    const randomIndex = Math.floor(Math.random() * WELCOME_MESSAGES.length);
    this.text = WELCOME_MESSAGES[randomIndex];
  }

  componentDidLoad() {
    this.animateText();
  }

  animateText() {
    this.text.split('').forEach((_, index) => {
      setTimeout(() => {
        this.visibleIndices = [...this.visibleIndices, index];
      }, index * 15);
    });
  }

  render() {
    if (this.chatHistory?.length || this.attachedFiles?.length) return null;

    return (
      <div>
        <div class="animated-text">
          {this.text.split('').map((letter, index) => (
            <span key={index} class={`letter ${this.visibleIndices.includes(index) ? 'visible' : ''}`}>
              {letter === ' ' ? '\u00A0' : letter}
            </span>
          ))}
        </div>
      </div>
    );
  }
}
