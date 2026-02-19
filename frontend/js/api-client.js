class ApiClientError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = "ApiClientError";
        this.status = details.status || 0;
        this.data = details.data || null;
        this.url = details.url || "";
        this.method = details.method || "GET";
    }
}

function extractApiErrorMessage(data, status) {
    if (!data) return `Ошибка запроса (${status})`;
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    if (data.error) return data.error;
    if (data.errors && typeof data.errors === "object") {
        const firstKey = Object.keys(data.errors)[0];
        const firstVal = data.errors[firstKey];
        if (Array.isArray(firstVal) && firstVal.length) return firstVal[0];
        if (typeof firstVal === "string") return firstVal;
    }
    return `Ошибка запроса (${status})`;
}

const apiClient = {
    getToken() {
        return localStorage.getItem("access");
    },

    clearSession() {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        localStorage.removeItem("user");
    },

    buildUrl(pathOrUrl) {
        if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
            return pathOrUrl;
        }
        return `${API_URL}${pathOrUrl}`;
    },

    async request(pathOrUrl, options = {}) {
        const method = options.method || "GET";
        const retries = Number.isInteger(options.retries) ? options.retries : 1;
        const auth = options.auth !== false;
        const expectRaw = options.raw === true;
        const url = this.buildUrl(pathOrUrl);

        const headers = {
            ...(options.headers || {}),
        };

        if (!headers["Content-Type"] && method !== "GET" && method !== "HEAD") {
            headers["Content-Type"] = "application/json";
        }

        if (auth) {
            const token = this.getToken();
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
        }

        const fetchOptions = {
            method,
            headers,
            body: options.body,
        };

        let response = null;
        let networkErr = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                response = await fetch(url, fetchOptions);
                if (response.status >= 500 && attempt < retries) {
                    continue;
                }
                break;
            } catch (err) {
                networkErr = err;
                if (attempt === retries) {
                    throw new ApiClientError("Сервер недоступен", {
                        status: 0,
                        data: { detail: "Сервер недоступен" },
                        url,
                        method,
                    });
                }
            }
        }

        if (!response) {
            throw new ApiClientError("Сервер недоступен", {
                status: 0,
                data: { detail: networkErr?.message || "Сервер недоступен" },
                url,
                method,
            });
        }

        if (response.status === 401 && auth) {
            this.clearSession();
            redirectToLogin();
            throw new ApiClientError("Сессия истекла, войдите снова.", {
                status: 401,
                data: { detail: "Unauthorized" },
                url,
                method,
            });
        }

        const contentType = response.headers.get("content-type") || "";
        let data = null;
        if (contentType.includes("application/json")) {
            data = await response.json();
        } else if (response.status !== 204) {
            data = await response.text();
        }

        if (!response.ok) {
            throw new ApiClientError(extractApiErrorMessage(data, response.status), {
                status: response.status,
                data,
                url,
                method,
            });
        }

        return expectRaw ? { response, data } : data;
    },

    get(path, options = {}) {
        return this.request(path, { ...options, method: "GET" });
    },

    post(path, body, options = {}) {
        return this.request(path, {
            ...options,
            method: "POST",
            body: body != null ? JSON.stringify(body) : undefined,
        });
    },

    patch(path, body, options = {}) {
        return this.request(path, {
            ...options,
            method: "PATCH",
            body: body != null ? JSON.stringify(body) : undefined,
        });
    },

    delete(path, body, options = {}) {
        return this.request(path, {
            ...options,
            method: "DELETE",
            body: body != null ? JSON.stringify(body) : undefined,
        });
    },
};
