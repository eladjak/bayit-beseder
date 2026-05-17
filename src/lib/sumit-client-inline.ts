/**
 * Sumit API client — inlined TypeScript version (mirrors @elad/sumit-client).
 *
 * Inlined here because Turbopack does not resolve symlinked `file:` deps
 * when the source is outside the Next.js project root. The canonical JS
 * version lives at /projects/_lib/sumit-client/src/index.js and was verified
 * end-to-end 2026-05-14. If that one changes, sync the changes here.
 *
 * API base: https://api.sumit.co.il
 * Auth: every POST body must include `Credentials: { CompanyID, APIKey }`
 * Response shape: { Data, Status, UserErrorMessage } → Status:0 = OK
 */

const SUMIT_BASE = 'https://api.sumit.co.il';

export class SumitError extends Error {
  status?: number | string;
  endpoint?: string;
  response?: unknown;

  constructor(
    message: string,
    init: { status?: number | string; endpoint?: string; response?: unknown } = {},
  ) {
    super(message);
    this.name = 'SumitError';
    this.status = init.status;
    this.endpoint = init.endpoint;
    this.response = init.response;
  }
}

interface SumitEnvelope {
  Data?: unknown;
  Status?: number;
  UserErrorMessage?: string;
}

export interface SumitClient {
  raw: (path: string, payload?: Record<string, unknown>) => Promise<unknown>;
  customers: {
    create: (customer: Record<string, unknown>) => Promise<unknown>;
    update: (customer: Record<string, unknown>) => Promise<unknown>;
    getDetailsUrl: (customerId: string | number) => Promise<unknown>;
  };
  documents: {
    list: (params?: Record<string, unknown>) => Promise<unknown>;
    create: (document: Record<string, unknown>) => Promise<unknown>;
    send: (params: {
      documentId: string | number;
      email?: string;
      sms?: string;
    }) => Promise<unknown>;
    getPdf: (documentId: string | number) => Promise<unknown>;
    getDetails: (documentId: string | number) => Promise<unknown>;
    cancel: (documentId: string | number, reason?: string) => Promise<unknown>;
  };
  payments: {
    charge: (payload: Record<string, unknown>) => Promise<unknown>;
    get: (paymentId: string | number) => Promise<unknown>;
    list: (filter?: Record<string, unknown>) => Promise<unknown>;
    beginRedirect: (payload: Record<string, unknown>) => Promise<unknown>;
  };
  recurring: {
    charge: (payload: Record<string, unknown>) => Promise<unknown>;
    listForCustomer: (customerId: string | number) => Promise<unknown>;
  };
  paymentMethods: {
    getForCustomer: (customerId: string | number) => Promise<unknown>;
    setForCustomer: (payload: Record<string, unknown>) => Promise<unknown>;
    remove: (paymentMethodId: string | number) => Promise<unknown>;
  };
}

export interface SumitClientConfig {
  companyId: string | number;
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export function createSumitClient({
  companyId,
  apiKey,
  fetchImpl,
}: SumitClientConfig): SumitClient {
  if (!companyId) throw new Error('createSumitClient: companyId required');
  if (!apiKey) throw new Error('createSumitClient: apiKey required');

  const doFetch: typeof fetch = fetchImpl ?? globalThis.fetch;

  async function call(path: string, payload: Record<string, unknown> = {}): Promise<unknown> {
    const fullPath = path.startsWith('/') ? path : '/' + path;
    const body = {
      Credentials: { CompanyID: Number(companyId), APIKey: apiKey },
      ...payload,
    };
    const res = await doFetch(SUMIT_BASE + fullPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new SumitError(`HTTP ${res.status}`, { status: res.status, endpoint: fullPath });
    }
    const json = (await res.json()) as SumitEnvelope;
    if (json.Status !== 0) {
      throw new SumitError(json.UserErrorMessage || `Sumit Status ${json.Status}`, {
        status: json.Status,
        endpoint: fullPath,
        response: json,
      });
    }
    return json.Data;
  }

  return {
    raw: call,

    customers: {
      create: (customer) => call('/accounting/customers/create/', { Customer: customer }),
      update: (customer) => call('/accounting/customers/update/', { Customer: customer }),
      getDetailsUrl: (customerId) =>
        call('/accounting/customers/getdetailsurl/', { CustomerID: customerId }),
    },

    documents: {
      list: ({ page = 1, pageSize = 20, ...rest } = {}) =>
        call('/accounting/documents/list/', { Page: page, PageSize: pageSize, ...rest }),
      create: (document) => call('/accounting/documents/create/', document),
      send: ({ documentId, email, sms } = { documentId: 0 }) =>
        call('/accounting/documents/send/', {
          DocumentID: documentId,
          EmailAddress: email,
          SMSPhone: sms,
        }),
      getPdf: (documentId) =>
        call('/accounting/documents/getpdf/', { DocumentID: documentId }),
      getDetails: (documentId) =>
        call('/accounting/documents/getdetails/', { DocumentID: documentId }),
      cancel: (documentId, reason) =>
        call('/accounting/documents/cancel/', { DocumentID: documentId, Reason: reason }),
    },

    payments: {
      charge: (payload) => call('/billing/payments/charge/', payload),
      get: (paymentId) => call('/billing/payments/get/', { PaymentID: paymentId }),
      list: (filter = {}) => call('/billing/payments/list/', filter),
      beginRedirect: (payload) => call('/billing/payments/beginredirect/', payload),
    },

    recurring: {
      charge: (payload) => call('/billing/recurring/charge/', payload),
      listForCustomer: (customerId) =>
        call('/billing/recurring/listforcustomer/', { CustomerID: customerId }),
    },

    paymentMethods: {
      getForCustomer: (customerId) =>
        call('/billing/paymentmethods/getforcustomer/', { CustomerID: customerId }),
      setForCustomer: (payload) =>
        call('/billing/paymentmethods/setforcustomer/', payload),
      remove: (paymentMethodId) =>
        call('/billing/paymentmethods/remove/', { PaymentMethodID: paymentMethodId }),
    },
  };
}

export default createSumitClient;
