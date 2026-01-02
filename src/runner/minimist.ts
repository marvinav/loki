
type UnknownFlagCallback = (arg: string) => boolean | void;
type FlagKey = string;

export interface MinimistOptions {
    alias?: Record<FlagKey, FlagKey | FlagKey[]>;
    boolean?: boolean | FlagKey | FlagKey[];
    string?: FlagKey | FlagKey[];
    default?: Record<string, unknown>;
    '--'?: boolean;
    stopEarly?: boolean;
    unknown?: UnknownFlagCallback;
}

export type MinimistParsedArgs = Array<string>

// Checks if a nested key path exists in an object.
function hasKey(obj: Record<string, unknown>, keys: string[] | number[]) {
    let o = obj;

    keys.slice(0, -1).forEach((key: string | number) => {
        o = o?.[key] as Record<string, unknown>;
    });


    const key = keys[keys.length - 1];

    if (key && o) {
        return key in o;
    }

    return false
}

function isNumber(x: string) {
    if (/^0x[0-9a-f]+$/i.test(x)) {
        return true;
    }

    return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(x);
}

function isConstructorOrProto<T>(obj: T, key: keyof T) {
    return (
        (key === 'constructor' && typeof obj[key] === 'function') ||
        key === '__proto__'
    );
}

export default function <T>(args: MinimistParsedArgs, opts: MinimistOptions = {}) {
    const flags = {
        bools: {} as Record<string, boolean>,
        strings: {} as Record<string, boolean>,
        allBools: false,
        unknownFn: null as null | Function,
    };

    if (typeof opts.unknown === 'function') {
        flags.unknownFn = opts.unknown;
    }

    if (typeof opts.boolean === 'boolean' && opts.boolean) {
        flags.allBools = true;
    } else if (opts.boolean) {
        ([] as Array<string>)
            .concat(opts.boolean)
            .filter(Boolean)
            .forEach((key) => {
                flags.bools[key] = true;
            });
    }

    const aliases = {} as Record<string, string[]>;

    Object.keys(opts.alias ?? {}).forEach((key) => {
        if (opts.alias?.[key]) {
            aliases[key] = ([] as Array<string>).concat(opts.alias?.[key]);

            aliases[key].forEach((x) => {
                aliases[x] = [key].concat(aliases[key]?.filter((y) => x !== y) ?? []);
            });
        }
    });


    const aliasIsBoolean = (key: string) => {
        return aliases[key]?.some((x) => flags.bools[x]);
    }

    if (opts.string) {
        ([] as Array<string>)
            .concat(opts.string)
            .filter(Boolean)
            .forEach((key) => {
                flags.strings[key] = true;

                if (aliases[key]) {
                    ([] as Array<string>).concat(aliases[key]).forEach((k) => {
                        flags.strings[k] = true;
                    });
                }
            });
    }

    const defaults = opts.default || {};

    const argv = { _: [] as (string | number)[], '--': [] as string[] };

    function argDefined(key: string, arg: string) {
        return (
            (flags.allBools && /^--[^=]+$/.test(arg)) ||
            flags.strings[key] ||
            flags.bools[key] ||
            aliases[key]
        );
    }

    function setKey(obj: any, keys: string[], value: unknown) {
        let o = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i]!;

            if (isConstructorOrProto(o, key)) {
                return;
            }

            if (o[key] === undefined) {
                o[key] = {};
            }

            if (
                o[key] === Object.prototype ||
                o[key] === Number.prototype ||
                o[key] === String.prototype
            ) {
                o[key] = {};
            }

            if (o[key] === Array.prototype) {
                o[key] = [];
            }

            o = o[key];
        }

        const lastKey = keys[keys.length - 1]!;

        if (isConstructorOrProto(o, lastKey)) {
            return;
        }

        if (
            o === Object.prototype ||
            o === Number.prototype ||
            o === String.prototype
        ) {
            o = {};
        }

        if (o === Array.prototype) {
            o = [];
        }

        if (
            o[lastKey] === undefined ||
            flags.bools[lastKey] ||
            typeof o[lastKey] === 'boolean'
        ) {
            o[lastKey] = value;
        } else if (Array.isArray(o[lastKey])) {
            o[lastKey].push(value);
        } else {
            o[lastKey] = [o[lastKey], value];
        }
    }

    function setArg(key: string | undefined, val: unknown, arg?: string) {
        if (!key) {
            return;
        }
        if (arg && flags.unknownFn && !argDefined(key, arg)) {
            if (flags.unknownFn(arg) === false) {
                return;
            }
        }

        const value = !flags.strings[key] && typeof val === 'string' && isNumber(val) ? Number(val) : val;

        setKey(argv, key.split('.'), value);

        (aliases[key] || []).forEach((x) => {
            setKey(argv, x.split('.'), value);
        });
    }

    Object.keys(flags.bools).forEach((key) => {
        setArg(key, defaults[key] === undefined ? false : defaults[key]);
    });

    let notFlags: string[] = [];

    if (args.indexOf('--') !== -1) {
        notFlags = args.slice(args.indexOf('--') + 1);

        args = args.slice(0, args.indexOf('--'));
    }

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        let key;

        let next;

        if (arg && /^--.+=/.test(arg)) {
            // Using [\s\S] instead of . because js doesn't support the
            // 'dotall' regex modifier. See:
            // http://stackoverflow.com/a/1068308/13216
            const m = arg.match(/^--([^=]+)=([\s\S]*)$/);

            key = m?.[1];

            let value: boolean | string | undefined = m?.[2];
            if (key !== undefined && flags.bools[key]) {
                value = value !== 'false';
            }

            setArg(key, value, arg);
        } else if (arg && /^--no-.+/.test(arg)) {
            key = arg.match(/^--no-(.+)/)?.[1];

            setArg(key, false, arg);
        } else if (arg && /^--.+/.test(arg)) {
            key = arg.match(/^--(.+)/)?.[1];

            next = args[i + 1];

            if (
                key !== undefined &&
                next !== undefined &&
                !/^(-|--)[^-]/.test(next) &&
                !flags.bools[key] &&
                !flags.allBools &&
                (aliases[key] ? !aliasIsBoolean(key) : true)
            ) {
                setArg(key, next, arg);

                i += 1;
            } else if (next !== undefined && /^(true|false)$/.test(next)) {
                setArg(key, next === 'true', arg);

                i += 1;
            } else {
                setArg(key, key !== undefined && flags.strings[key] ? '' : true, arg);
            }
        } else if (arg && /^-[^-]+/.test(arg)) {
            const letters = arg.slice(1, -1).split('');

            let broken = false;

            for (let j = 0; j < letters.length; j++) {
                next = arg.slice(j + 2);

                if (next === '-') {
                    setArg(letters[j], next, arg);

                    continue;
                }
                const letter = letters[j];
                if (letter === undefined) {
                    break;
                }
                if (/[A-Za-z]/.test(letter) && next[0] === '=') {
                    setArg(letters[j], next.slice(1), arg);

                    broken = true;

                    break;
                }

                if (
                    /[A-Za-z]/.test(letter) &&
                    /-?\d+(\.\d*)?(e-?\d+)?$/.test(next)
                ) {
                    setArg(letters[j], next, arg);

                    broken = true;

                    break;
                }

                if (letters[j + 1] && letters[j + 1]?.match(/\W/)) {
                    setArg(letters[j], arg.slice(j + 2), arg);

                    broken = true;

                    break;
                } else {
                    setArg(letters[j], flags.strings[letter] ? '' : true, arg);
                }
            }

            key = arg.slice(-1)[0];

            if (key !== undefined && !broken && key !== '-') {
                if (
                    args[i + 1] &&
                    !/^(-|--)[^-]/.test(args[i + 1]!) &&
                    !flags.bools[key] &&
                    (aliases[key] ? !aliasIsBoolean(key) : true)
                ) {
                    setArg(key, args[i + 1], arg);

                    i += 1;
                } else if (args[i + 1] && /^(true|false)$/.test(args[i + 1]!)) {
                    setArg(key, args[i + 1] === 'true', arg);

                    i += 1;
                } else {
                    setArg(key, flags.strings[key] ? '' : true, arg);
                }
            }
        } else {
            if (!flags.unknownFn || flags.unknownFn(arg) !== false) {

                argv._.push(flags.strings._ || !isNumber(arg!) ? arg! : Number(arg));
            }

            if (opts.stopEarly) {
                argv._.push.apply(argv._, args.slice(i + 1));

                break;
            }
        }
    }

    Object.keys(defaults).forEach((k) => {
        if (!hasKey(argv, k.split('.'))) {
            setKey(argv, k.split('.'), defaults[k]);

            (aliases[k] || []).forEach((x) => {
                setKey(argv, x.split('.'), defaults[k]);
            });
        }
    });

    if (opts['--']) {
        argv['--'] = notFlags.slice();
    } else {
        notFlags.forEach((k) => {
            argv._.push(k);
        });
    }

    return argv as typeof argv & T;
};
