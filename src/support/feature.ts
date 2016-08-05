declare var process: any;

export function supportStrictTypes () {
    return process.env.USE_STRICT_TYPES == 'true';
}
