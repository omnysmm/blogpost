// Support tickets + Realtime chat (Supabase)
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  fetchTickets,
  createTicket,
  createTicketMessage,
  fetchTicketMessages,
} from './crud';

export interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  lastReply?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  sender: 'user' | 'ai' | 'operator';
  content: string;
  createdAt: string;
}

const LOCAL_TICKETS_PREFIX = 'blogpost_tickets_';
const LOCAL_MESSAGES_PREFIX = 'blogpost_ticket_messages_';
const CHAT_TICKET_SUBJECT = '__ai_chat__';

function localTicketsKey(userId: string) {
  return `${LOCAL_TICKETS_PREFIX}${userId}`;
}
function localMessagesKey(ticketId: string) {
  return `${LOCAL_MESSAGES_PREFIX}${ticketId}`;
}

function mapTicket(r: any): SupportTicket {
  return {
    id: r.id,
    subject: r.subject || '',
    status: (r.status as SupportTicket['status']) || 'open',
    priority: (r.priority as SupportTicket['priority']) || 'medium',
    createdAt: r.created_at || new Date().toISOString(),
    lastReply: r.updated_at || undefined,
  };
}

function mapMessage(r: any): TicketMessage {
  return {
    id: r.id,
    ticketId: r.ticket_id,
    sender: (r.sender as TicketMessage['sender']) || 'user',
    content: r.content || '',
    createdAt: r.created_at || new Date().toISOString(),
  };
}

// ═══ Local fallback ═══

function loadLocalTickets(userId: string): SupportTicket[] {
  try {
    return JSON.parse(localStorage.getItem(localTicketsKey(userId)) || '[]');
  } catch {
    return [];
  }
}

function saveLocalTickets(userId: string, tickets: SupportTicket[]): void {
  try {
    localStorage.setItem(localTicketsKey(userId), JSON.stringify(tickets));
  } catch {}
}

function loadLocalMessages(ticketId: string): TicketMessage[] {
  try {
    return JSON.parse(localStorage.getItem(localMessagesKey(ticketId)) || '[]');
  } catch {
    return [];
  }
}

function saveLocalMessages(ticketId: string, messages: TicketMessage[]): void {
  try {
    localStorage.setItem(localMessagesKey(ticketId), JSON.stringify(messages));
  } catch {}
}

// ═══ Tickets ═══

export async function loadSupportTickets(userId: string): Promise<SupportTicket[]> {
  if (!isSupabaseConfigured) return loadLocalTickets(userId);

  const rows = await fetchTickets(userId);
  const tickets = (rows as any[])
    .filter((r) => r.subject !== CHAT_TICKET_SUBJECT)
    .map(mapTicket);

  if (tickets.length > 0) {
    saveLocalTickets(userId, tickets);
    return tickets;
  }
  return loadLocalTickets(userId);
}

export async function createSupportTicket(
  userId: string,
  subject: string,
  priority: SupportTicket['priority'],
  firstMessage: string
): Promise<SupportTicket | null> {
  const localTicket: SupportTicket = {
    id: Date.now().toString(),
    subject,
    status: 'open',
    priority,
    createdAt: new Date().toISOString(),
    lastReply: new Date().toISOString(),
  };

  if (!isSupabaseConfigured) {
    const tickets = [localTicket, ...loadLocalTickets(userId)];
    saveLocalTickets(userId, tickets);
    const msg: TicketMessage = {
      id: `${localTicket.id}-1`,
      ticketId: localTicket.id,
      sender: 'user',
      content: firstMessage,
      createdAt: new Date().toISOString(),
    };
    saveLocalMessages(localTicket.id, [msg]);
    return localTicket;
  }

  const ticketRow = await createTicket({
    user_id: userId,
    subject,
    status: 'open',
    priority,
  });
  if (!ticketRow) {
    // fallback to local
    const tickets = [localTicket, ...loadLocalTickets(userId)];
    saveLocalTickets(userId, tickets);
    return localTicket;
  }

  const ticket = mapTicket(ticketRow);
  await createTicketMessage({
    ticket_id: ticket.id,
    sender: 'user',
    content: firstMessage,
  });

  const tickets = [ticket, ...loadLocalTickets(userId).filter((t) => t.id !== ticket.id)];
  saveLocalTickets(userId, tickets);
  saveLocalMessages(ticket.id, [
    {
      id: `${ticket.id}-1`,
      ticketId: ticket.id,
      sender: 'user',
      content: firstMessage,
      createdAt: new Date().toISOString(),
    },
  ]);
  return ticket;
}

// ═══ Messages ═══

export async function loadTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  if (!isSupabaseConfigured) return loadLocalMessages(ticketId);

  const rows = await fetchTicketMessages(ticketId);
  const messages = (rows as any[]).map(mapMessage).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (messages.length > 0) {
    saveLocalMessages(ticketId, messages);
    return messages;
  }
  return loadLocalMessages(ticketId);
}

export async function sendTicketMessage(
  ticketId: string,
  sender: TicketMessage['sender'],
  content: string
): Promise<TicketMessage | null> {
  const localMsg: TicketMessage = {
    id: `${Date.now()}`,
    ticketId,
    sender,
    content,
    createdAt: new Date().toISOString(),
  };

  const existing = loadLocalMessages(ticketId);
  saveLocalMessages(ticketId, [...existing, localMsg]);

  if (!isSupabaseConfigured) return localMsg;

  const row = await createTicketMessage({
    ticket_id: ticketId,
    sender,
    content,
  });
  return row ? mapMessage(row) : localMsg;
}

// ═══ AI chat persistence (single rolling ticket per user) ═══

export async function loadChatTicketId(userId: string): Promise<string | null> {
  const key = `blogpost_chat_ticket_${userId}`;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function ensureChatTicket(userId: string): Promise<string> {
  const existing = await loadChatTicketId(userId);
  if (existing) return existing;

  if (!isSupabaseConfigured) {
    const id = `chat-${userId}`;
    localStorage.setItem(`blogpost_chat_ticket_${userId}`, id);
    return id;
  }

  const row = await createTicket({
    user_id: userId,
    subject: CHAT_TICKET_SUBJECT,
    status: 'open',
    priority: 'low',
  }) as { id?: string } | null;
  const id = row?.id || `chat-${userId}`;
  localStorage.setItem(`blogpost_chat_ticket_${userId}`, id);
  return id;
}

// ═══ Realtime ═══

/**
 * Subscribe to INSERTs on ticket_messages for a ticket.
 * Returns unsubscribe. No-op when Supabase is not configured.
 */
export function subscribeTicketMessages(
  ticketId: string,
  onInsert: (msg: TicketMessage) => void
): () => void {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel(`ticket_messages:${ticketId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticketId}`,
      },
      (payload) => {
        onInsert(mapMessage(payload.new));
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/** Subscribe to INSERTs/UPDATEs on tickets for a user (live list updates). */
export function subscribeTickets(
  userId: string,
  onChange: (ticket: SupportTicket, event: 'INSERT' | 'UPDATE') => void
): () => void {
  if (!isSupabaseConfigured) return () => {};

  const channel = supabase
    .channel(`tickets:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'tickets',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onChange(mapTicket(payload.new), 'INSERT')
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tickets',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onChange(mapTicket(payload.new), 'UPDATE')
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to the shared AI-chat thread (rolling ticket).
 * Also receives operator replies in realtime.
 */
export function subscribeChatThread(
  ticketId: string,
  onMessage: (msg: TicketMessage) => void
): () => void {
  return subscribeTicketMessages(ticketId, (msg) => {
    // Skip echo of messages the client itself just wrote (same id prefix)
    onMessage(msg);
  });
}
