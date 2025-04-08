import { deflate, inflate } from 'pako';

export const unicodeAwareStringArraySorter = (a: string, b: string) => a.localeCompare(b);

export const sha1 = async (...data: unknown[]) =>
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(data.join(' ')))))
        .map((n) => n.toString(16).padStart(2, '0'))
        .join('');

export const compress = (uncompressedData: string) =>
    btoa(
        Array.from(
            deflate(uncompressedData, {
                level: 9,
            }),
        )
            .map((n) => String.fromCharCode(n))
            .join(''),
    );

export const decompress = (compressedData: string) => {
    return new TextDecoder().decode(
        inflate(
            new Uint8Array(
                atob(compressedData)
                    .split('')
                    .map((char) => char.charCodeAt(0)),
            ),
        ),
    );
};
