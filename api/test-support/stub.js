export function stubMethod(target, key, replacement) {
	const original = target[key];
	target[key] = replacement;

	return () => {
		target[key] = original;
	};
}
