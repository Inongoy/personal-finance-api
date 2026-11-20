import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ApiError, readApiResponse } from './api.ts'

test('reads successful API responses', async () => {
  const response = new Response(JSON.stringify({ data: { id: 1 } }), { status: 200 })
  assert.deepEqual(await readApiResponse(response), { id: 1 })
})

test('reports Laravel validation and authentication errors', async () => {
  const invalid = new Response(JSON.stringify({ message: 'Invalid input.', errors: { email: ['Email is required.'] } }), { status: 422 })
  await assert.rejects(readApiResponse(invalid), { name: 'Error', message: 'Email is required.', status: 422 })
  const unauthorized = new Response(JSON.stringify({ message: 'You are not logged in.', errors: [] }), { status: 401 })
  await assert.rejects(readApiResponse(unauthorized), (error) => error instanceof ApiError && error.status === 401)
})

test('reports an unavailable API instead of a JSON error', async () => {
  await assert.rejects(readApiResponse(new Response(null, { status: 502 })), {
    message: 'The API is unavailable. Make sure the Laravel server is running, then try again.',
    status: 502,
  })
})

test('rejects invalid success responses', async () => {
  for (const body of ['', '<html>Not JSON</html>', '{}']) {
    await assert.rejects(readApiResponse(new Response(body, { status: 200 })), {
      message: 'The API returned an invalid response. Please try again.',
    })
  }
})
