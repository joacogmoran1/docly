const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function getPagination(filters = {}) {
	const requestedLimit = Number.parseInt(filters.limit, 10);
	const requestedOffset = Number.parseInt(filters.offset, 10);

	const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
		? Math.min(requestedLimit, MAX_LIMIT)
		: DEFAULT_LIMIT;

	const offset = Number.isFinite(requestedOffset) && requestedOffset > 0
		? requestedOffset
		: 0;

	return { limit, offset };
}

export function buildPaginatedResult(key, rows, total, pagination) {
	return {
		[key]: rows,
		total,
		limit: pagination.limit,
		offset: pagination.offset,
	};
}

export function normalizePaginatedResult(result, key) {
	if (Array.isArray(result)) {
		return {
			results: result.length,
			total: result.length,
			data: result,
		};
	}

	const data = result?.[key] ?? result?.rows ?? result?.data ?? [];
	const total = Number.isFinite(Number(result?.total))
		? Number(result.total)
		: data.length;

	const response = {
		results: data.length,
		total,
		data,
	};

	if (result?.limit !== undefined) {
		response.limit = result.limit;
	}

	if (result?.offset !== undefined) {
		response.offset = result.offset;
	}

	return response;
}
