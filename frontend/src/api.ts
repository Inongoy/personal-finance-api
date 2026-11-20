export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function readApiResponse<T>(response: Response): Promise<T> {
  const body = await response.text()
  let json: unknown

  if (body) {
    try {
      json = JSON.parse(body)
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
    }
  }

  if (!response.ok) {
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      const result = json as Record<string, unknown>
      if (result.errors && typeof result.errors === 'object' && !Array.isArray(result.errors)) {
        const messages = Object.values(result.errors).flat().filter((message): message is string => typeof message === 'string')
        if (messages.length) throw new ApiError(messages.join(' '), response.status)
      }
      if (typeof result.message === 'string' && result.message) {
        throw new ApiError(result.message, response.status)
      }
    }

    if (response.status === 502 || response.status === 503 || response.status === 504) {
      throw new ApiError('The API is unavailable. Make sure the Laravel server is running, then try again.', response.status)
    }
    throw new ApiError(`The API request failed (HTTP ${response.status}).`, response.status)
  }

  if (!json || typeof json !== 'object' || Array.isArray(json) || !('data' in json)) {
    throw new Error('The API returned an invalid response. Please try again.')
  }

  return json.data as T
}
