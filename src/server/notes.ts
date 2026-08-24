import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { notes } from '../db/schema'
import { requireAuth } from './auth'
import type { AppEnv } from './types'

export const apiApp = new Hono<AppEnv>()

// Current user profile
apiApp.get('/me', requireAuth, (c) => {
  const user = c.get('user')
  return c.json({ user })
})

// List all notes for authenticated user
apiApp.get('/notes', requireAuth, async (c) => {
  const user = c.get('user')!
  const db = c.get('db')

  const userNotes = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, user.id))
    .orderBy(desc(notes.updatedAt))

  return c.json({ notes: userNotes })
})

// Create a new note
apiApp.post('/notes', requireAuth, async (c) => {
  const user = c.get('user')!
  const db = c.get('db')

  let body: { title?: string; content?: string } = {}
  try {
    body = await c.req.json()
  } catch {
    body = {}
  }

  const now = Date.now()
  const newNote = {
    id: crypto.randomUUID(),
    userId: user.id,
    title: (body.title ?? '').trim() || 'Untitled Note',
    content: body.content ?? '',
    createdAt: now,
    updatedAt: now
  }

  await db.insert(notes).values(newNote)

  return c.json({ note: newNote }, 201)
})

// Update an existing note
apiApp.patch('/notes/:id', requireAuth, async (c) => {
  const user = c.get('user')!
  const db = c.get('db')
  const noteId = c.req.param('id')

  let body: { title?: string; content?: string } = {}
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400)
  }

  const existingNotes = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .limit(1)

  if (existingNotes.length === 0) {
    return c.json({ error: 'Note not found' }, 404)
  }

  const now = Date.now()
  const updatedFields: { title?: string; content?: string; updatedAt: number } = {
    updatedAt: now
  }

  if (typeof body.title === 'string') {
    updatedFields.title = body.title
  }
  if (typeof body.content === 'string') {
    updatedFields.content = body.content
  }

  await db
    .update(notes)
    .set(updatedFields)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))

  const updatedNote = {
    ...existingNotes[0],
    ...updatedFields
  }

  return c.json({ note: updatedNote })
})

// Delete a note
apiApp.delete('/notes/:id', requireAuth, async (c) => {
  const user = c.get('user')!
  const db = c.get('db')
  const noteId = c.req.param('id')

  const existingNotes = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .limit(1)

  if (existingNotes.length === 0) {
    return c.json({ error: 'Note not found' }, 404)
  }

  await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))

  return c.json({ success: true, id: noteId })
})
