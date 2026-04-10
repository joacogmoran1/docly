export declare const SESSION_STORAGE_VERSION = 1;
export declare const SESSION_MAX_IDLE_MS: number;
export declare const PDF_UPLOAD_MAX_BYTES: number;
export declare const CONTENT_SECURITY_POLICY: string;
export declare const SECURITY_HEADERS: {
    readonly "Content-Security-Policy": string;
    readonly "Referrer-Policy": "no-referrer";
    readonly "X-Content-Type-Options": "nosniff";
    readonly "X-Frame-Options": "DENY";
    readonly "X-DNS-Prefetch-Control": "off";
    readonly "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), accelerometer=(), gyroscope=()";
    readonly "Cross-Origin-Opener-Policy": "same-origin";
    readonly "Cross-Origin-Resource-Policy": "same-origin";
    readonly "Origin-Agent-Cluster": "?1";
    readonly "X-Permitted-Cross-Domain-Policies": "none";
};
export declare const DEVELOPMENT_SECURITY_HEADERS: {
    readonly "Referrer-Policy": "no-referrer";
    readonly "X-Content-Type-Options": "nosniff";
    readonly "X-Frame-Options": "DENY";
    readonly "X-DNS-Prefetch-Control": "off";
    readonly "Cross-Origin-Opener-Policy": "same-origin";
    readonly "Origin-Agent-Cluster": "?1";
};
