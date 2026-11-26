import { Message, MessagePart } from '../types/interfaces';

type MessagePartSource = Pick<Message, 'parts' | 'thinking' | 'content' | 'tool_calls' | 'mapWidgets'>;

export function getMessageParts(message: MessagePartSource): MessagePart[] {
  if (message.parts) return message.parts;

  return [
    ...(message.thinking ? [{ type: 'thinking' as const, content: message.thinking }] : []),
    ...(message.content ? [{ type: 'text' as const, content: message.content }] : []),
    ...(message.tool_calls ?? []).map(call => ({ type: 'tool_call' as const, call })),
    ...(message.mapWidgets ?? []).map(mapData => ({ type: 'map' as const, mapData })),
  ];
}

export function appendMessagePart(parts: MessagePart[], part: MessagePart): MessagePart[] {
  const previousPart = parts[parts.length - 1];
  if ((part.type === 'text' || part.type === 'thinking') && previousPart?.type === part.type) {
    return [...parts.slice(0, -1), { ...previousPart, content: previousPart.content + part.content }];
  }
  return [...parts, part];
}
