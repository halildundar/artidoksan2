const BASE_URL = import.meta.env.VITE_API_URL as string;

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    // Ağ hatası ("Failed to fetch"): API kapalı ya da henüz açılmamış
    throw new ApiError('Sunucuya ulaşılamadı — API çalışmıyor olabilir', 0);
  }
  if (!res.ok) {
    let message = `İstek başarısız (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      /* gövde JSON değilse varsayılan mesaj kalır */
    }
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}
