// Any RFC 9562 UUID (v4 from gen_random_uuid(), v7 from uuidv7(), ...)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tells a UUID apart from a slug in routes that accept both (/products/:idOrSlug)
 */
export const isUuid = (value) => UUID_REGEX.test(value);
