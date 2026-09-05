import { createServer, type ServerResponse } from 'node:http'

type Session = {
  id: string
  slug: string
  projectID: string
  directory: string
  title: string
  version: string
  time: {
    created: number
    updated: number
  }
}

export type MessageWithParts = {
  info: Record<string, unknown>
  parts: Array<Record<string, unknown>>
}

type PermissionRequest = {
  id: string
  sessionID: string
  permission: string
  patterns: string[]
  metadata: Record<string, unknown>
  always: string[]
}

type RecordedRequest = {
  method: string
  pathname: string
  body: unknown
}

export type MockOpenCode = {
  url: string
  sessions: Session[]
  messages: Map<string, MessageWithParts[]>
  permissions: PermissionRequest[]
  requests: RecordedRequest[]
  emit(directory: string, type: string, properties: unknown): void
  close(): Promise<void>
}

export async function startMockOpenCode(options?: {
  directory?: string
  sessions?: Session[]
  permissions?: PermissionRequest[]
}): Promise<MockOpenCode> {
  const directory = options?.directory ?? '/tmp/opencodex-e2e-project'
  const sessions = options?.sessions ?? []
  const messages = new Map<string, MessageWithParts[]>()
  const permissions = options?.permissions ?? []
  const requests: RecordedRequest[] = []
  const streams = new Set<ServerResponse>()
  const emit = (eventDirectory: string, type: string, properties: unknown) => {
    const value = `data: ${JSON.stringify({
      directory: eventDirectory,
      payload: { type, properties },
    })}\n\n`
    streams.forEach(stream => stream.write(value))
  }

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const method = request.method ?? 'GET'
    const body = await readBody(request)
    requests.push({ method, pathname: url.pathname, body })
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Headers', 'authorization, content-type')
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS')
    if (method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }

    if (url.pathname === '/global/event') {
      response.writeHead(200, {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Content-Type': 'text/event-stream',
      })
      response.write(': connected\n\n')
      streams.add(response)
      request.on('close', () => streams.delete(response))
      return
    }

    if (url.pathname === '/global/health') return json(response, { healthy: true, version: '1.2.3-e2e' })
    if (url.pathname === '/experimental/capabilities') {
      return json(response, {
        apiVersion: 2,
        backgroundSubagents: true,
        worktree: true,
        worktreeBaseBranch: true,
        vcsMutations: true,
        workspaceCheckpoints: true,
        advancedVcs: true,
        checkpointRegistry: true,
        memory: true,
        hooks: true,
        pullRequests: true,
      })
    }
    if (url.pathname === '/config/providers') return json(response, modelResponse())
    if (url.pathname === '/provider') {
      const model = modelResponse()
      return json(response, { all: model.providers, connected: [], default: model.default })
    }
    if (url.pathname === '/provider/auth') return json(response, {})
    if (url.pathname === '/agent') {
      return json(response, [{
        name: 'build',
        description: 'E2E build agent',
        mode: 'primary',
        native: true,
        permission: [],
        options: {},
      }])
    }
    if (url.pathname === '/path') {
      return json(response, {
        home: directory,
        state: directory,
        config: directory,
        worktree: directory,
        directory,
      })
    }
    if (url.pathname === '/project' || url.pathname === '/project/current') {
      const project = {
        id: 'project-e2e',
        name: directory.split('/').at(-1),
        worktree: directory,
        vcs: 'git',
        time: { created: Date.now(), updated: Date.now() },
        sandboxes: [],
      }
      return json(response, url.pathname === '/project' ? [project] : project)
    }
    if (url.pathname === '/session/status') return json(response, {})
    if (url.pathname === '/experimental/session') return json(response, sessions.map(session => ({ ...session, project: null })))
    if (url.pathname === '/session' && method === 'GET') return json(response, sessions)
    if (url.pathname === '/session' && method === 'POST') {
      const input = isRecord(body) ? body : {}
      const session = makeSession(
        `ses_e2e_${sessions.length + 1}`,
        url.searchParams.get('directory') ?? directory,
        typeof input.title === 'string' ? input.title : 'E2E task',
      )
      sessions.push(session)
      messages.set(session.id, [])
      json(response, session)
      queueMicrotask(() => emit(session.directory, 'session.created', { info: session }))
      return
    }
    if (url.pathname === '/permission' && method === 'GET') return json(response, permissions)
    if (url.pathname === '/question' && method === 'GET') return json(response, [])

    const sessionMatch = url.pathname.match(/^\/session\/([^/]+)$/)
    if (sessionMatch) {
      const session = sessions.find(item => item.id === sessionMatch[1])
      if (!session) return json(response, { error: 'not found' }, 404)
      if (method === 'PATCH') {
        const input = isRecord(body) ? body : {}
        if (typeof input.title === 'string') session.title = input.title
        session.time.updated = Date.now()
      }
      return json(response, session)
    }

    const sessionResource = url.pathname.match(/^\/session\/([^/]+)\/(children|todo|diff|message)$/)
    if (sessionResource && method === 'GET') {
      if (sessionResource[2] === 'message') return json(response, messages.get(sessionResource[1]) ?? [])
      return json(response, [])
    }

    const promptMatch = url.pathname.match(/^\/session\/([^/]+)\/prompt_async$/)
    if (promptMatch && method === 'POST') {
      const session = sessions.find(item => item.id === promptMatch[1])
      if (!session) return json(response, { error: 'not found' }, 404)
      json(response, true)
      streamPrompt(session, isRecord(body) ? body : {}, messages, emit)
      return
    }

    const permissionMatch = url.pathname.match(/^\/session\/([^/]+)\/permissions\/([^/]+)$/)
    const permissionReplyMatch = url.pathname.match(/^\/permission\/([^/]+)\/reply$/)
    if ((permissionMatch || permissionReplyMatch) && method === 'POST') {
      const requestID = permissionMatch?.[2] ?? permissionReplyMatch?.[1] ?? ''
      const permission = permissions.find(item => item.id === requestID)
      const sessionID = permissionMatch?.[1] ?? permission?.sessionID ?? ''
      const index = permissions.findIndex(item => item.id === requestID)
      if (index >= 0) permissions.splice(index, 1)
      json(response, true)
      queueMicrotask(() => emit(directory, 'permission.replied', {
        sessionID,
        requestID,
        reply: isRecord(body) && typeof body.response === 'string'
          ? body.response
          : isRecord(body) && typeof body.reply === 'string'
            ? body.reply
            : 'once',
      }))
      return
    }

    if (url.pathname === '/config' || url.pathname === '/global/config') return json(response, {})
    if (url.pathname === '/command') return json(response, [])
    if (url.pathname === '/experimental/console') {
      return json(response, { consoleManagedProviders: [], switchableOrgCount: 0 })
    }
    return json(response, method === 'GET' ? [] : true)
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Mock OpenCode server did not start')

  return {
    url: `http://127.0.0.1:${address.port}`,
    sessions,
    messages,
    permissions,
    requests,
    emit,
    close() {
      streams.forEach(stream => stream.end())
      return new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve())
      })
    },
  }
}

export function makeSession(id: string, directory: string, title: string): Session {
  const now = Date.now()
  return {
    id,
    slug: id,
    projectID: 'project-e2e',
    directory,
    title,
    version: '1',
    time: {
      created: now,
      updated: now,
    },
  }
}

async function readBody(request: NodeJS.ReadableStream) {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  if (chunks.length === 0) return undefined
  const text = Buffer.concat(chunks).toString('utf8')
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function json(response: ServerResponse, value: unknown, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function modelResponse() {
  return {
    providers: [{
      id: 'e2e',
      name: 'E2E Provider',
      source: 'custom',
      env: [],
      options: {},
      models: {
        'stream-model': {
          id: 'stream-model',
          providerID: 'e2e',
          api: { id: 'stream-model', url: 'http://127.0.0.1', npm: '@ai-sdk/openai-compatible' },
          name: 'E2E Stream Model',
          family: 'e2e',
          capabilities: {
            temperature: true,
            reasoning: true,
            attachment: false,
            toolcall: true,
            input: { text: true, audio: false, image: false, video: false, pdf: false },
            output: { text: true, audio: false, image: false, video: false, pdf: false },
            interleaved: false,
          },
          cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
          limit: { context: 32_000, output: 4_096 },
          status: 'active',
          options: {},
          headers: {},
          release_date: '2026-01-01',
          variants: { high: {} },
        },
      },
    }],
    default: { e2e: 'stream-model' },
  }
}

function streamPrompt(
  session: Session,
  body: Record<string, unknown>,
  messages: Map<string, MessageWithParts[]>,
  emit: (directory: string, type: string, properties: unknown) => void,
) {
  const now = Date.now()
  const userID = `msg_user_${now}`
  const assistantID = `msg_assistant_${now}`
  const text = Array.isArray(body.parts)
    ? body.parts
        .filter(isRecord)
        .filter(part => part.type === 'text' && part.synthetic !== true && typeof part.text === 'string')
        .map(part => String(part.text))
        .join('\n')
    : ''
  const userInfo = {
    id: userID,
    sessionID: session.id,
    role: 'user',
    time: { created: now },
    agent: typeof body.agent === 'string' ? body.agent : 'build',
    model: { providerID: 'e2e', modelID: 'stream-model' },
  }
  const userPart = {
    id: `part_user_${now}`,
    sessionID: session.id,
    messageID: userID,
    type: 'text',
    text,
  }
  const assistantInfo = {
    id: assistantID,
    sessionID: session.id,
    role: 'assistant',
    time: { created: now + 1 },
    parentID: userID,
    modelID: 'stream-model',
    providerID: 'e2e',
    mode: 'build',
    agent: 'build',
    path: { cwd: session.directory, root: session.directory },
    cost: 0,
    tokens: { input: 1, output: 2, reasoning: 0, cache: { read: 0, write: 0 } },
  }
  const assistantPart = {
    id: `part_assistant_${now}`,
    sessionID: session.id,
    messageID: assistantID,
    type: 'text',
    text: '',
  }
  messages.set(session.id, [
    { info: userInfo, parts: [userPart] },
    { info: assistantInfo, parts: [assistantPart] },
  ])

  setTimeout(() => {
    emit(session.directory, 'message.updated', { info: userInfo })
    emit(session.directory, 'message.part.updated', { part: userPart })
    emit(session.directory, 'message.updated', { info: assistantInfo })
    emit(session.directory, 'message.part.updated', { part: assistantPart })
    emit(session.directory, 'session.status', { sessionID: session.id, status: { type: 'busy' } })
  }, 40)
  setTimeout(() => {
    emit(session.directory, 'message.part.delta', {
      sessionID: session.id,
      messageID: assistantID,
      partID: assistantPart.id,
      field: 'text',
      delta: '正在流式',
    })
  }, 120)
  setTimeout(() => {
    emit(session.directory, 'message.part.delta', {
      sessionID: session.id,
      messageID: assistantID,
      partID: assistantPart.id,
      field: 'text',
      delta: '返回结果',
    })
    emit(session.directory, 'session.idle', { sessionID: session.id })
    emit(session.directory, 'session.status', { sessionID: session.id, status: { type: 'idle' } })
  }, 700)
}
